BEGIN;

-- Where a property came from, plus the registry details kept with it.
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS registered_units integer,
  ADD COLUMN IF NOT EXISTS osm_id text;

ALTER TABLE public.properties
  DROP CONSTRAINT IF EXISTS properties_source_check;
ALTER TABLE public.properties
  ADD CONSTRAINT properties_source_check
  CHECK (source IN ('manual', 'hrm_registry'));

-- Lower-cases text, drops punctuation and spells out common street
-- abbreviations, so 'Spring Garden Rd.' and 'spring garden road' compare
-- equal. Used on both the stored properties and what people type.
CREATE OR REPLACE FUNCTION public.normalize_search_text(p_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
DECLARE
  result text := pg_catalog.lower(COALESCE(p_text, ''));
  abbreviation record;
BEGIN
  result := pg_catalog.regexp_replace(result, '[''’]', '', 'g');
  result := pg_catalog.regexp_replace(result, '[^a-z0-9]+', ' ', 'g');
  FOR abbreviation IN
    SELECT * FROM (VALUES
      ('st', 'street'), ('rd', 'road'), ('dr', 'drive'), ('ave', 'avenue'),
      ('av', 'avenue'), ('blvd', 'boulevard'), ('ln', 'lane'),
      ('crt', 'court'), ('ct', 'court'), ('cres', 'crescent'),
      ('pl', 'place'), ('terr', 'terrace'), ('ter', 'terrace'),
      ('hwy', 'highway')
    ) AS t(short, long)
  LOOP
    result := pg_catalog.regexp_replace(
      result, '\m' || abbreviation.short || '\M', abbreviation.long, 'g');
  END LOOP;
  RETURN pg_catalog.btrim(pg_catalog.regexp_replace(result, '\s+', ' ', 'g'));
END;
$$;

ALTER TABLE public.properties
  DROP COLUMN IF EXISTS search_text;
ALTER TABLE public.properties
  ADD COLUMN search_text text GENERATED ALWAYS AS (
    public.normalize_search_text(name || ' ' || address || ' ' || city)
  ) STORED;

-- Finds properties whose name, address or town contain every word typed
-- (in any order, partial words allowed), best matches first.
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

REVOKE ALL ON FUNCTION public.search_properties(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_properties(text, integer)
  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.normalize_search_text(text)
  TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
