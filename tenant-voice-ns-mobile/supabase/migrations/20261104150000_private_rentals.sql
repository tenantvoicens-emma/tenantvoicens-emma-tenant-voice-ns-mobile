BEGIN;

-- Private rentals: houses, rooms, suites, duplexes and condos rented from
-- their owner. With only a few tenants, the landlord may be able to tell
-- who wrote a review, so the site shows less about when it was written.
-- Everything here is additive: the site already live keeps working.

-- What kind of rental a property is. NULL means not known yet (older
-- renter-added buildings), and is treated like a larger building.
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS rental_kind text;
ALTER TABLE public.properties
  DROP CONSTRAINT IF EXISTS properties_rental_kind_check;
ALTER TABLE public.properties
  ADD CONSTRAINT properties_rental_kind_check
  CHECK (rental_kind IN ('building', 'condo', 'small_building', 'house', 'suite', 'room'));

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS is_small_rental boolean
  GENERATED ALWAYS AS (
    COALESCE(rental_kind IN ('condo', 'small_building', 'house', 'suite', 'room'), false)
  ) STORED;

-- The registry's larger buildings.
UPDATE public.properties
SET rental_kind = 'building'
WHERE source = 'hrm_registry'
  AND rental_kind IS NULL
  AND registered_units >= 4;

-- Whether the landlord lived there too, as the writer remembers it.
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS landlord_on_site text;
ALTER TABLE public.reviews
  DROP CONSTRAINT IF EXISTS reviews_landlord_on_site_check;
ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_landlord_on_site_check
  CHECK (landlord_on_site IN ('yes', 'no', 'unsure'));

-- The date shown publicly: the day for larger buildings, only the year
-- (January 1) for small rentals. The exact time stays in created_at,
-- which a later migration hides from the public.
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS published_on date;

CREATE OR REPLACE FUNCTION private.public_review_date(
  p_created_at timestamptz,
  p_property_id bigint
)
RETURNS date
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE
    WHEN COALESCE((
      SELECT property.is_small_rental
      FROM public.properties AS property
      WHERE property.id = p_property_id
    ), false)
      THEN pg_catalog.date_trunc('year', p_created_at AT TIME ZONE 'UTC')::date
    ELSE (p_created_at AT TIME ZONE 'UTC')::date
  END;
$$;

CREATE OR REPLACE FUNCTION private.set_review_published_on()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.published_on := private.public_review_date(NEW.created_at, NEW.property_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reviews_set_published_on ON public.reviews;
CREATE TRIGGER reviews_set_published_on
  BEFORE INSERT OR UPDATE OF created_at, property_id ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION private.set_review_published_on();

-- When a property's kind changes (for example the moderator marks a
-- renter-added building as a house), its reviews' dates follow.
CREATE OR REPLACE FUNCTION private.refresh_property_review_dates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.reviews
  SET published_on = private.public_review_date(created_at, property_id)
  WHERE property_id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS properties_refresh_review_dates ON public.properties;
CREATE TRIGGER properties_refresh_review_dates
  AFTER UPDATE OF rental_kind ON public.properties
  FOR EACH ROW
  WHEN (OLD.rental_kind IS DISTINCT FROM NEW.rental_kind)
  EXECUTE FUNCTION private.refresh_property_review_dates();

REVOKE ALL ON FUNCTION private.public_review_date(timestamptz, bigint)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.set_review_published_on()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.refresh_property_review_dates()
  FROM PUBLIC, anon, authenticated;

UPDATE public.reviews
SET published_on = private.public_review_date(created_at, property_id)
WHERE published_on IS NULL;

ALTER TABLE public.reviews
  ALTER COLUMN published_on SET NOT NULL;

-- Two landlord ratings that matter most with private landlords, offered
-- on every review.
-- The original rule is named landlord_rating_category_check (singular).
ALTER TABLE public.landlord_ratings
  DROP CONSTRAINT IF EXISTS landlord_rating_category_check;
ALTER TABLE public.landlord_ratings
  DROP CONSTRAINT IF EXISTS landlord_ratings_category_check;
ALTER TABLE public.landlord_ratings
  ADD CONSTRAINT landlord_ratings_category_check
  CHECK (category IN (
    'overall', 'communication', 'repair_speed', 'professionalism',
    'lease_transparency', 'move_in_experience', 'privacy', 'deposit_handling'
  ));

-- Adding a property now also records what kind of rental it is. A match
-- with no kind yet takes the renter's answer; a known kind (from the
-- registry) is kept.
DROP FUNCTION IF EXISTS public.find_or_suggest_property(text, text, text);

CREATE FUNCTION public.find_or_suggest_property(
  p_address text,
  p_city text,
  p_name text DEFAULT NULL,
  p_rental_kind text DEFAULT NULL
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
     OR pg_catalog.char_length(COALESCE(clean_name, '')) > 80
     OR (p_rental_kind IS NOT NULL AND p_rental_kind NOT IN
         ('building', 'condo', 'small_building', 'house', 'suite', 'room')) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Building address, town, name or rental type is not valid';
  END IF;

  SELECT id INTO existing_id
  FROM public.properties
  WHERE public.normalize_search_text(address) = public.normalize_search_text(clean_address)
    AND public.normalize_search_text(city) = public.normalize_search_text(clean_city)
  ORDER BY is_listed DESC, id
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    IF p_rental_kind IS NOT NULL THEN
      UPDATE public.properties
      SET rental_kind = p_rental_kind
      WHERE id = existing_id
        AND rental_kind IS NULL;
    END IF;
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

  INSERT INTO public.properties (slug, name, address, city, source, is_listed, rental_kind)
  VALUES (new_slug, COALESCE(clean_name, clean_address), clean_address, clean_city,
          'renter_suggested', false, p_rental_kind)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.find_or_suggest_property(text, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_or_suggest_property(text, text, text, text)
  TO service_role;

-- Reviews can now say whether the landlord lived there too.
DROP FUNCTION IF EXISTS public.submit_review(
  bigint, text, text, text, jsonb, jsonb, uuid
);

CREATE FUNCTION public.submit_review(
  p_property_id bigint,
  p_review_text text,
  p_occupancy_duration text,
  p_would_live_again text,
  p_property_ratings jsonb,
  p_landlord_ratings jsonb,
  p_user_id uuid,
  p_landlord_on_site text DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_review_id bigint;
BEGIN
  IF p_review_text IS NULL OR pg_catalog.btrim(p_review_text) = '' THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Review text is required';
  END IF;

  IF p_occupancy_duration IS NULL OR p_would_live_again IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Occupancy duration and would-live-again answer are required';
  END IF;

  IF COALESCE(pg_catalog.jsonb_typeof(p_property_ratings), '') <> 'array'
     OR COALESCE(pg_catalog.jsonb_typeof(p_landlord_ratings), '') <> 'array' THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Ratings must be JSON arrays';
  END IF;

  INSERT INTO public.reviews (
    property_id,
    review_text,
    occupancy_duration,
    would_live_again,
    landlord_on_site,
    created_at,
    status
  )
  VALUES (
    p_property_id,
    pg_catalog.btrim(p_review_text),
    p_occupancy_duration,
    p_would_live_again,
    p_landlord_on_site,
    pg_catalog.now(),
    'pending'
  )
  RETURNING id INTO new_review_id;

  INSERT INTO public.property_ratings (review_id, category, score)
  SELECT new_review_id, rating.category, rating.score
  FROM pg_catalog.jsonb_to_recordset(p_property_ratings)
    AS rating(category text, score text);

  INSERT INTO public.landlord_ratings (review_id, category, score)
  SELECT new_review_id, rating.category, rating.score
  FROM pg_catalog.jsonb_to_recordset(p_landlord_ratings)
    AS rating(category text, score text);

  IF p_user_id IS NOT NULL THEN
    INSERT INTO private.review_authorship (review_id, user_id)
    VALUES (new_review_id, p_user_id);
  END IF;

  RETURN new_review_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_review(
  bigint, text, text, text, jsonb, jsonb, uuid, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_review(
  bigint, text, text, text, jsonb, jsonb, uuid, text
) TO service_role;

-- The moderation page reads exact submission times through this, so
-- they can be hidden from the public reviews table.
CREATE OR REPLACE FUNCTION public.get_review_submitted_at(p_review_ids bigint[])
RETURNS TABLE (review_id bigint, submitted_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF pg_catalog.lower(COALESCE((SELECT auth.jwt()) ->> 'email', '')) <>
    'tenantvoicens@gmail.com' THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Only the configured moderator can read submission times';
  END IF;

  RETURN QUERY
  SELECT review.id, review.created_at
  FROM public.reviews AS review
  WHERE review.id = ANY (p_review_ids);
END;
$function$;

REVOKE ALL ON FUNCTION public.get_review_submitted_at(bigint[])
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_review_submitted_at(bigint[])
  TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
