BEGIN;

-- Reviews are now about the property only. Landlords and property managers
-- are no longer rated or asked about. This migration:
--   1. adds "problems" a reviewer can tick (reviews.issues),
--   2. lets a review be submitted without free text,
--   3. adds optional private evidence pictures, readable only by the moderator,
--   4. stops accepting landlord ratings and the landlord-on-site answer,
--   5. takes existing landlord data out of public view (it is kept, not deleted),
--   6. hides a review at once when a "Legal concern" report is made on it.
--
-- Apply this before deploying the matching app release: the new app calls
-- submit_review with different arguments.

-- 1. Ticked problems --------------------------------------------------------

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS issues text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.reviews
  DROP CONSTRAINT IF EXISTS reviews_issues_check;
ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_issues_check
  CHECK (
    pg_catalog.cardinality(issues) <= 10
    AND issues <@ ARRAY[
      'mice_rats',
      'bedbugs_pests',
      'mold_moisture',
      'water_leaks',
      'no_heat',
      'no_hot_water',
      'repairs_over_14_days',
      'broken_security',
      'fire_safety',
      'noise_problems'
    ]::text[]
  );

-- 2/5. What the public can read from reviews: the same columns as before,
-- plus issues, and no longer landlord_on_site. Existing landlord_on_site and
-- landlord rating values stay in the database but are not readable through
-- the public API.
REVOKE SELECT ON public.reviews FROM anon, authenticated;
GRANT SELECT (
  id,
  property_id,
  review_text,
  occupancy_duration,
  would_live_again,
  status,
  moderator_edited,
  published_on,
  issues
) ON public.reviews TO anon, authenticated;

-- The Discover view no longer includes a landlord rating. A view can't
-- lose a column with CREATE OR REPLACE, so it is dropped and rebuilt. It
-- still matches lib/ratings overallScore.
DROP VIEW IF EXISTS public.discover_top_properties;

CREATE VIEW public.discover_top_properties
WITH (security_invoker = true)
AS
WITH review_scores AS (
  SELECT
    reviews.id AS review_id,
    reviews.property_id,
    COALESCE(
      (
        SELECT property_ratings.score::numeric
        FROM public.property_ratings AS property_ratings
        WHERE property_ratings.review_id = reviews.id
          AND property_ratings.category = 'overall'
          AND property_ratings.score ~ '^[0-9]+(\.[0-9]+)?$'
      ),
      (
        SELECT pg_catalog.avg(property_ratings.score::numeric)
        FROM public.property_ratings AS property_ratings
        WHERE property_ratings.review_id = reviews.id
          AND property_ratings.category <> 'overall'
          AND property_ratings.score ~ '^[0-9]+(\.[0-9]+)?$'
      )
    ) AS property_score
  FROM public.reviews AS reviews
  WHERE reviews.status = 'approved'
)
SELECT
  properties.id,
  properties.slug,
  properties.name,
  properties.address,
  properties.city,
  pg_catalog.count(review_scores.review_id)::bigint AS review_count,
  pg_catalog.round(pg_catalog.avg(review_scores.property_score), 1) AS property_rating
FROM public.properties AS properties
JOIN review_scores
  ON review_scores.property_id = properties.id
GROUP BY
  properties.id,
  properties.slug,
  properties.name,
  properties.address,
  properties.city;

REVOKE ALL ON public.discover_top_properties FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.discover_top_properties TO anon, authenticated;

-- Landlord ratings are kept (nothing is deleted) but no longer public.
DROP POLICY IF EXISTS landlord_ratings_read_approved
  ON public.landlord_ratings;
REVOKE ALL ON TABLE public.landlord_ratings FROM PUBLIC, anon, authenticated;

-- 3. Optional private evidence ----------------------------------------------

-- Pictures a reviewer attached as proof (JPEGs the browser already shrunk).
-- Nobody can read this table directly; the moderator reads it through
-- get_review_evidence below. A picture is deleted with its review, so it
-- follows the same retention as the review (including the 24-month cleanup
-- of rejected reviews).
CREATE TABLE IF NOT EXISTS private.review_evidence (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  review_id bigint NOT NULL
    REFERENCES public.reviews(id) ON DELETE CASCADE,
  mime_type text NOT NULL CHECK (mime_type = 'image/jpeg'),
  data bytea NOT NULL
    CHECK (pg_catalog.octet_length(data) BETWEEN 4 AND 400000),
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now()
);

CREATE INDEX IF NOT EXISTS review_evidence_review_id_idx
  ON private.review_evidence (review_id);

ALTER TABLE private.review_evidence ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.review_evidence
  FROM PUBLIC, anon, authenticated, service_role;

-- 2/4. New submit_review: property only, ticked problems, optional text and
-- optional evidence. The old version took landlord ratings.
DROP FUNCTION IF EXISTS public.submit_review(
  bigint, text, text, text, jsonb, jsonb, uuid, text
);

CREATE FUNCTION public.submit_review(
  p_property_id bigint,
  p_review_text text,
  p_occupancy_duration text,
  p_would_live_again text,
  p_property_ratings jsonb,
  p_user_id uuid,
  p_issues text[] DEFAULT '{}',
  p_evidence jsonb DEFAULT '[]'::jsonb
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_review_id bigint;
  clean_text text := COALESCE(pg_catalog.btrim(p_review_text), '');
  clean_issues text[] := COALESCE(p_issues, '{}');
  has_rating boolean;
  picture record;
  picture_bytes bytea;
BEGIN
  IF p_occupancy_duration IS NULL OR p_would_live_again IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Occupancy duration and would-live-again answer are required';
  END IF;

  IF COALESCE(pg_catalog.jsonb_typeof(p_property_ratings), '') <> 'array' THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Ratings must be a JSON array';
  END IF;

  IF COALESCE(pg_catalog.jsonb_typeof(p_evidence), '') <> 'array'
     OR pg_catalog.jsonb_array_length(p_evidence) > 3 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Evidence must be a JSON array of at most 3 pictures';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM pg_catalog.jsonb_to_recordset(p_property_ratings)
      AS rating(category text, score text)
    WHERE rating.score IS NOT NULL AND rating.score <> 'na'
  ) INTO has_rating;

  -- A review needs something in it: text, a ticked problem or a rating.
  IF clean_text = '' AND pg_catalog.cardinality(clean_issues) = 0
     AND NOT has_rating THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'A review needs text, a ticked problem or a rating';
  END IF;

  INSERT INTO public.reviews (
    property_id,
    review_text,
    occupancy_duration,
    would_live_again,
    issues,
    created_at,
    status
  )
  VALUES (
    p_property_id,
    clean_text,
    p_occupancy_duration,
    p_would_live_again,
    ARRAY(SELECT DISTINCT pg_catalog.unnest(clean_issues)),
    pg_catalog.now(),
    'pending'
  )
  RETURNING id INTO new_review_id;

  INSERT INTO public.property_ratings (review_id, category, score)
  SELECT new_review_id, rating.category, rating.score
  FROM pg_catalog.jsonb_to_recordset(p_property_ratings)
    AS rating(category text, score text);

  -- Optional pictures: JPEGs only, each under 400 KB.
  FOR picture IN
    SELECT item."mimeType" AS mime_type, item.data AS data
    FROM pg_catalog.jsonb_to_recordset(p_evidence)
      AS item("mimeType" text, data text)
  LOOP
    picture_bytes := pg_catalog.decode(picture.data, 'base64');
    IF picture.mime_type IS DISTINCT FROM 'image/jpeg'
       OR pg_catalog.octet_length(picture_bytes) > 400000
       OR pg_catalog.substring(picture_bytes, 1, 3) <> '\xffd8ff'::bytea THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023',
        MESSAGE = 'Evidence must be a JPEG picture under 400 KB';
    END IF;
    INSERT INTO private.review_evidence (review_id, mime_type, data)
    VALUES (new_review_id, 'image/jpeg', picture_bytes);
  END LOOP;

  IF p_user_id IS NOT NULL THEN
    INSERT INTO private.review_authorship (review_id, user_id)
    VALUES (new_review_id, p_user_id);
  END IF;

  RETURN new_review_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_review(
  bigint, text, text, text, jsonb, uuid, text[], jsonb
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_review(
  bigint, text, text, text, jsonb, uuid, text[], jsonb
) TO service_role;

-- How many pictures each review has, for the moderation page.
CREATE FUNCTION public.get_review_evidence_counts(p_review_ids bigint[])
RETURNS TABLE (review_id bigint, evidence_count integer)
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
      MESSAGE = 'Only the configured moderator can read evidence';
  END IF;

  RETURN QUERY
  SELECT evidence.review_id, pg_catalog.count(*)::integer
  FROM private.review_evidence AS evidence
  WHERE evidence.review_id = ANY (p_review_ids)
  GROUP BY evidence.review_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_review_evidence_counts(bigint[])
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_review_evidence_counts(bigint[])
  TO authenticated;

-- One review's pictures, base64-encoded, for the moderator only.
CREATE FUNCTION public.get_review_evidence(p_review_id bigint)
RETURNS TABLE (id bigint, mime_type text, data text)
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
      MESSAGE = 'Only the configured moderator can read evidence';
  END IF;

  RETURN QUERY
  SELECT
    evidence.id,
    evidence.mime_type,
    pg_catalog.translate(pg_catalog.encode(evidence.data, 'base64'), E'\n', '')
  FROM private.review_evidence AS evidence
  WHERE evidence.review_id = p_review_id
  ORDER BY evidence.id;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_review_evidence(bigint)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_review_evidence(bigint)
  TO authenticated;

-- 6. A "Legal concern" report hides the review at once ----------------------

-- Same as before, except that a report with the reason 'legal_concern' on a
-- published review unpublishes it straight away (status 'rejected', the same
-- state the moderator's Unpublish button sets) and logs that in the review's
-- moderation history. The moderator then decides whether to restore it
-- ("Approve after all") or leave it down. Returns 'submitted',
-- 'hidden' (submitted, and the review was hidden), 'rate_limited' or
-- 'not_found'.
CREATE OR REPLACE FUNCTION public.submit_review_report(
  p_review_id bigint,
  p_reason text,
  p_details text,
  p_contact_email text,
  p_ip_fingerprint text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  current_count integer;
  clean_details text := NULLIF(pg_catalog.btrim(COALESCE(p_details, '')), '');
  clean_email text :=
    NULLIF(pg_catalog.lower(pg_catalog.btrim(COALESCE(p_contact_email, ''))), '');
BEGIN
  IF p_ip_fingerprint IS NULL
     OR p_ip_fingerprint !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Invalid rate-limit fingerprint';
  END IF;

  INSERT INTO private.review_report_limits AS limits (
    ip_fingerprint, window_started_at, request_count, updated_at
  )
  VALUES (p_ip_fingerprint, pg_catalog.now(), 1, pg_catalog.now())
  ON CONFLICT (ip_fingerprint) DO UPDATE
  SET
    window_started_at = CASE
      WHEN limits.window_started_at <= pg_catalog.now() - interval '1 hour'
        THEN pg_catalog.now()
      ELSE limits.window_started_at
    END,
    request_count = CASE
      WHEN limits.window_started_at <= pg_catalog.now() - interval '1 hour'
        THEN 1
      ELSE limits.request_count + 1
    END,
    updated_at = pg_catalog.now()
  RETURNING request_count INTO current_count;

  DELETE FROM private.review_report_limits
  WHERE ip_fingerprint IN (
    SELECT stale.ip_fingerprint
    FROM private.review_report_limits AS stale
    WHERE stale.updated_at < pg_catalog.now() - interval '48 hours'
    ORDER BY stale.updated_at
    LIMIT 100
  );

  IF current_count > 10 THEN
    RETURN 'rate_limited';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.reviews
    WHERE id = p_review_id AND status = 'approved'
  ) THEN
    RETURN 'not_found';
  END IF;

  -- The table's checks reject a bad reason, overlong details or a
  -- malformed email.
  INSERT INTO private.review_reports (review_id, reason, details, contact_email)
  VALUES (p_review_id, p_reason, clean_details, clean_email);

  IF p_reason = 'legal_concern' THEN
    UPDATE public.reviews
    SET status = 'rejected'
    WHERE id = p_review_id AND status = 'approved';

    IF FOUND THEN
      INSERT INTO private.moderation_events (
        review_id, from_status, to_status, note, moderator_email, text_edited
      )
      VALUES (
        p_review_id,
        'approved',
        'rejected',
        'Hidden automatically: a legal concern was reported. Decide whether to restore it or leave it down.',
        'system (automatic hide)',
        false
      );
      RETURN 'hidden';
    END IF;
  END IF;

  RETURN 'submitted';
END;
$function$;

REVOKE ALL ON FUNCTION public.submit_review_report(bigint, text, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_review_report(bigint, text, text, text, text)
  TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
