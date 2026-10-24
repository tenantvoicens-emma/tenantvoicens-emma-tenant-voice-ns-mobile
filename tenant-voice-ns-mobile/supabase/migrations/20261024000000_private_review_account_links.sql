BEGIN;

CREATE SCHEMA IF NOT EXISTS private AUTHORIZATION postgres;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS private.review_authorship (
  review_id bigint PRIMARY KEY
    REFERENCES public.reviews(id) ON DELETE CASCADE,
  user_id uuid NOT NULL
    REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now()
);

ALTER TABLE private.review_authorship ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.review_authorship
  FROM PUBLIC, anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.submit_review(
  bigint, text, text, text, jsonb, jsonb
);

CREATE FUNCTION public.submit_review(
  p_property_id bigint,
  p_review_text text,
  p_occupancy_duration text,
  p_would_live_again text,
  p_property_ratings jsonb,
  p_landlord_ratings jsonb,
  p_user_id uuid
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
    created_at,
    status
  )
  VALUES (
    p_property_id,
    pg_catalog.btrim(p_review_text),
    p_occupancy_duration,
    p_would_live_again,
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
  bigint, text, text, text, jsonb, jsonb, uuid
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_review(
  bigint, text, text, text, jsonb, jsonb, uuid
) TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;