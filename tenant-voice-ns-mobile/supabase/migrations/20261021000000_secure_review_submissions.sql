BEGIN;

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint
    WHERE conname = 'reviews_status_check'
      AND conrelid = 'public.reviews'::regclass
  ) THEN
    ALTER TABLE public.reviews
      ADD CONSTRAINT reviews_status_check
      CHECK (status IN ('pending', 'approved', 'rejected'));
  END IF;
END;
$$;

REVOKE ALL PRIVILEGES ON TABLE
  public.reviews,
  public.property_ratings,
  public.landlord_ratings
FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE
  public.reviews,
  public.property_ratings,
  public.landlord_ratings
TO anon, authenticated;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landlord_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reviews_read_approved
  ON public.reviews;
CREATE POLICY reviews_read_approved
  ON public.reviews
  FOR SELECT
  TO anon, authenticated
  USING (status = 'approved');

DROP POLICY IF EXISTS property_ratings_read_approved
  ON public.property_ratings;
CREATE POLICY property_ratings_read_approved
  ON public.property_ratings
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.reviews
      WHERE public.reviews.id = public.property_ratings.review_id
        AND public.reviews.status = 'approved'
    )
  );

DROP POLICY IF EXISTS landlord_ratings_read_approved
  ON public.landlord_ratings;
CREATE POLICY landlord_ratings_read_approved
  ON public.landlord_ratings
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.reviews
      WHERE public.reviews.id = public.landlord_ratings.review_id
        AND public.reviews.status = 'approved'
    )
  );

CREATE OR REPLACE FUNCTION public.submit_review(
  p_property_id bigint,
  p_review_text text,
  p_occupancy_duration text,
  p_would_live_again text,
  p_property_ratings jsonb DEFAULT '[]'::jsonb,
  p_landlord_ratings jsonb DEFAULT '[]'::jsonb
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

  RETURN new_review_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_review(
  bigint, text, text, text, jsonb, jsonb
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.submit_review(
  bigint, text, text, text, jsonb, jsonb
) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;