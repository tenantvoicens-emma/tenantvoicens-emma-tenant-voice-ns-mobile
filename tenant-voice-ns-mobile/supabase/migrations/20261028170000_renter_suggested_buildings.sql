BEGIN;

-- Renters can add a building that isn't listed when they review it. It
-- stays hidden from the public (no search result, no page) until the
-- moderator approves a review for it.
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS is_listed boolean NOT NULL DEFAULT true;

ALTER TABLE public.properties
  DROP CONSTRAINT IF EXISTS properties_source_check;
ALTER TABLE public.properties
  ADD CONSTRAINT properties_source_check
  CHECK (source IN ('manual', 'hrm_registry', 'renter_suggested'));

DROP POLICY IF EXISTS properties_public_read ON public.properties;
CREATE POLICY properties_public_read
  ON public.properties
  FOR SELECT
  TO anon, authenticated
  USING (is_listed);

DROP POLICY IF EXISTS properties_admin_read_all ON public.properties;
CREATE POLICY properties_admin_read_all
  ON public.properties
  FOR SELECT
  TO authenticated
  USING (
    pg_catalog.lower(COALESCE((SELECT auth.jwt()) ->> 'email', '')) =
      'tenantvoicens@gmail.com'
  );

-- Search only ever shows listed buildings, even to the moderator.
CREATE OR REPLACE FUNCTION public.search_properties(
  p_query text,
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  id bigint,
  slug text,
  name text,
  address text,
  city text
)
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  WITH query AS (
    SELECT public.normalize_search_text(p_query) AS text
  )
  SELECT p.id, p.slug, p.name, p.address, p.city
  FROM public.properties AS p, query
  WHERE query.text <> ''
    AND p.is_listed
    AND NOT EXISTS (
      SELECT 1
      FROM pg_catalog.unnest(pg_catalog.string_to_array(query.text, ' ')) AS word
      WHERE pg_catalog.strpos(p.search_text, word) = 0
    )
  ORDER BY
    (public.normalize_search_text(p.name) LIKE query.text || '%') DESC,
    (public.normalize_search_text(p.address) LIKE query.text || '%') DESC,
    p.name
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50);
$$;

-- Finds the property at an address, or adds it as a hidden suggestion.
-- Called by the review API (service role) before submit_review, so a
-- renter typing an address that's already listed reviews that building
-- rather than creating a duplicate.
CREATE OR REPLACE FUNCTION public.find_or_suggest_property(
  p_address text,
  p_city text,
  p_name text DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  clean_address text := pg_catalog.btrim(pg_catalog.regexp_replace(COALESCE(p_address, ''), '\s+', ' ', 'g'));
  clean_city text := pg_catalog.btrim(pg_catalog.regexp_replace(COALESCE(p_city, ''), '\s+', ' ', 'g'));
  clean_name text := NULLIF(pg_catalog.btrim(pg_catalog.regexp_replace(COALESCE(p_name, ''), '\s+', ' ', 'g')), '');
  existing_id bigint;
  base_slug text;
  new_slug text;
  suffix integer := 2;
  new_id bigint;
BEGIN
  IF pg_catalog.char_length(clean_address) NOT BETWEEN 3 AND 120
     OR clean_address !~ '^[0-9]'
     OR pg_catalog.char_length(clean_city) NOT BETWEEN 2 AND 60
     OR pg_catalog.char_length(COALESCE(clean_name, '')) > 80 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Building address, town or name is not valid';
  END IF;

  SELECT id INTO existing_id
  FROM public.properties
  WHERE public.normalize_search_text(address) = public.normalize_search_text(clean_address)
    AND public.normalize_search_text(city) = public.normalize_search_text(clean_city)
  ORDER BY is_listed DESC, id
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    RETURN existing_id;
  END IF;

  -- Tidy text typed in all lower or all upper case ('77 nowhere lane'),
  -- but leave deliberate capitals ('McDonald') as they are.
  IF clean_address IN (pg_catalog.lower(clean_address), pg_catalog.upper(clean_address)) THEN
    clean_address := pg_catalog.initcap(clean_address);
  END IF;
  IF clean_city IN (pg_catalog.lower(clean_city), pg_catalog.upper(clean_city)) THEN
    clean_city := pg_catalog.initcap(clean_city);
  END IF;
  IF clean_name IN (pg_catalog.lower(clean_name), pg_catalog.upper(clean_name)) THEN
    clean_name := pg_catalog.initcap(clean_name);
  END IF;

  base_slug := pg_catalog.btrim(
    pg_catalog.regexp_replace(
      pg_catalog.lower(clean_address || ' ' || clean_city), '[^a-z0-9]+', '-', 'g'),
    '-');
  new_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.properties WHERE slug = new_slug) LOOP
    new_slug := base_slug || '-' || suffix;
    suffix := suffix + 1;
  END LOOP;

  INSERT INTO public.properties (slug, name, address, city, source, is_listed)
  VALUES (new_slug, COALESCE(clean_name, clean_address), clean_address, clean_city,
          'renter_suggested', false)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.find_or_suggest_property(text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_or_suggest_property(text, text, text)
  TO service_role;

-- Approving a review for a suggested building also lists the building.
CREATE OR REPLACE FUNCTION public.moderate_review(
  p_review_id bigint,
  p_status text,
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  moderator_email text :=
    pg_catalog.lower(COALESCE((SELECT auth.jwt()) ->> 'email', ''));
  current_status text;
  review_property_id bigint;
  clean_note text := NULLIF(pg_catalog.btrim(COALESCE(p_note, '')), '');
BEGIN
  IF moderator_email <> 'tenantvoicens@gmail.com' THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Only the configured moderator can review submissions';
  END IF;

  IF p_status IS NULL OR p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Moderation status must be approved or rejected';
  END IF;

  IF pg_catalog.char_length(clean_note) > 500 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Moderation notes must be 500 characters or fewer';
  END IF;

  SELECT status, property_id INTO current_status, review_property_id
  FROM public.reviews
  WHERE id = p_review_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Review was not found';
  END IF;

  IF current_status = p_status THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Review already has that status';
  END IF;

  UPDATE public.reviews
  SET status = p_status
  WHERE id = p_review_id;

  IF p_status = 'approved' THEN
    UPDATE public.properties
    SET is_listed = true
    WHERE id = review_property_id
      AND NOT is_listed;
  END IF;

  INSERT INTO private.moderation_events (
    review_id, from_status, to_status, note, moderator_email
  )
  VALUES (
    p_review_id, current_status, p_status, clean_note, moderator_email
  );
END;
$$;

NOTIFY pgrst, 'reload schema';

COMMIT;
