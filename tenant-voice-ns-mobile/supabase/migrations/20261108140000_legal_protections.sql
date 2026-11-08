BEGIN;

-- Legal protections, added after a review of the legal risks of running a
-- review site. This migration:
--   1. records which version of the Terms each review was submitted under
--      (the reviewer must tick a box confirming it is their own, honest
--      experience; the app sends the Terms version it showed),
--   2. adds legal holds, so a review (and its history, reports and proof
--      pictures) can't be deleted by the nightly cleanups while a legal
--      matter is open,
--   3. requires an email address and an explanation for a "Legal concern"
--      report, since that report hides a review at once.
--
-- Apply after 20261108120000_property_only_reviews.sql and before deploying
-- the matching app release.

-- 1. Which Terms a review was submitted under -------------------------------

-- Not in the public column grant, so the public can't read it.
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS terms_version text
  CHECK (terms_version IS NULL OR pg_catalog.char_length(terms_version) <= 40);

DROP FUNCTION IF EXISTS public.submit_review(
  bigint, text, text, text, jsonb, uuid, text[], jsonb
);

CREATE FUNCTION public.submit_review(
  p_property_id bigint,
  p_review_text text,
  p_occupancy_duration text,
  p_would_live_again text,
  p_property_ratings jsonb,
  p_user_id uuid,
  p_issues text[],
  p_evidence jsonb,
  p_terms_version text
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
  clean_terms text := NULLIF(pg_catalog.btrim(COALESCE(p_terms_version, '')), '');
  has_rating boolean;
  picture record;
  picture_bytes bytea;
BEGIN
  IF clean_terms IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'The reviewer must confirm the Terms of Service';
  END IF;

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
    terms_version,
    created_at,
    status
  )
  VALUES (
    p_property_id,
    clean_text,
    p_occupancy_duration,
    p_would_live_again,
    ARRAY(SELECT DISTINCT pg_catalog.unnest(clean_issues)),
    clean_terms,
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
  bigint, text, text, text, jsonb, uuid, text[], jsonb, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_review(
  bigint, text, text, text, jsonb, uuid, text[], jsonb, text
) TO service_role;

-- 2. Legal holds ------------------------------------------------------------

-- A review on hold is never deleted by the nightly cleanups: not the
-- 24-month cleanup of rejected reviews, and not the 24-month cleanup of
-- closed reports about it. Deleting evidence once a claim is threatened can
-- count against you, so the moderator places a hold as soon as a legal
-- notice, court order or threat arrives (see docs/legal-response-playbook.md).
CREATE TABLE IF NOT EXISTS private.legal_holds (
  review_id bigint PRIMARY KEY
    REFERENCES public.reviews(id) ON DELETE CASCADE,
  note text
    CHECK (note IS NULL OR pg_catalog.char_length(note) <= 500),
  placed_at timestamptz NOT NULL DEFAULT pg_catalog.now()
);

ALTER TABLE private.legal_holds ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.legal_holds
  FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.set_review_legal_hold(
  p_review_id bigint,
  p_hold boolean,
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  clean_note text := NULLIF(pg_catalog.btrim(COALESCE(p_note, '')), '');
BEGIN
  IF pg_catalog.lower(COALESCE((SELECT auth.jwt()) ->> 'email', '')) <>
    'tenantvoicens@gmail.com' THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Only the configured moderator can place legal holds';
  END IF;

  IF p_hold IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'A hold must be placed or released';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.reviews WHERE id = p_review_id) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Review was not found';
  END IF;

  IF p_hold THEN
    INSERT INTO private.legal_holds (review_id, note)
    VALUES (p_review_id, clean_note)
    ON CONFLICT (review_id) DO UPDATE
    SET note = COALESCE(EXCLUDED.note, private.legal_holds.note);
  ELSE
    DELETE FROM private.legal_holds WHERE review_id = p_review_id;
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.set_review_legal_hold(bigint, boolean, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_review_legal_hold(bigint, boolean, text)
  TO authenticated;

CREATE FUNCTION public.get_review_legal_holds(p_review_ids bigint[])
RETURNS TABLE (review_id bigint, placed_at timestamptz, note text)
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
      MESSAGE = 'Only the configured moderator can read legal holds';
  END IF;

  RETURN QUERY
  SELECT hold.review_id, hold.placed_at, hold.note
  FROM private.legal_holds AS hold
  WHERE hold.review_id = ANY (p_review_ids);
END;
$function$;

REVOKE ALL ON FUNCTION public.get_review_legal_holds(bigint[])
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_review_legal_holds(bigint[])
  TO authenticated;

-- The 24-month cleanup of rejected reviews now skips reviews on hold.
CREATE OR REPLACE FUNCTION private.delete_old_rejected_reviews()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  expired_ids bigint[];
  expired_property_ids bigint[];
  deleted_count integer;
BEGIN
  SELECT
    COALESCE(pg_catalog.array_agg(review.id), '{}'),
    COALESCE(pg_catalog.array_agg(DISTINCT review.property_id), '{}')
  INTO expired_ids, expired_property_ids
  FROM public.reviews AS review
  WHERE review.status = 'rejected'
    AND NOT EXISTS (
      SELECT 1 FROM private.legal_holds AS hold
      WHERE hold.review_id = review.id
    )
    AND COALESCE(
      (
        SELECT pg_catalog.max(event.created_at)
        FROM private.moderation_events AS event
        WHERE event.review_id = review.id
          AND event.to_status = 'rejected'
      ),
      review.created_at
    ) < pg_catalog.now() - interval '24 months';

  DELETE FROM public.property_ratings WHERE review_id = ANY (expired_ids);
  DELETE FROM public.landlord_ratings WHERE review_id = ANY (expired_ids);
  -- Moderation history, proof pictures and account links are removed by
  -- ON DELETE CASCADE.
  DELETE FROM public.reviews WHERE id = ANY (expired_ids);
  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  DELETE FROM public.properties AS property
  WHERE property.id = ANY (expired_property_ids)
    AND property.source = 'renter_suggested'
    AND NOT property.is_listed
    AND NOT EXISTS (
      SELECT 1 FROM public.reviews AS review
      WHERE review.property_id = property.id
    );

  RETURN deleted_count;
END;
$function$;

REVOKE ALL ON FUNCTION private.delete_old_rejected_reviews()
  FROM PUBLIC, anon, authenticated;

-- Closed reports about a review on hold are kept too.
CREATE OR REPLACE FUNCTION private.delete_old_review_reports()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM private.review_reports AS report
  WHERE report.status <> 'open'
    AND report.resolved_at < pg_catalog.now() - interval '24 months'
    AND NOT EXISTS (
      SELECT 1 FROM private.legal_holds AS hold
      WHERE hold.review_id = report.review_id
    );
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$function$;

REVOKE ALL ON FUNCTION private.delete_old_review_reports()
  FROM PUBLIC, anon, authenticated;

-- 3. A legal concern needs an email address and an explanation ---------------

-- A "Legal concern" report hides the review at once, so it has to come with
-- a way to reply and a reason the moderator can assess. Other reports are
-- unchanged. Returns 'submitted', 'hidden', 'rate_limited' or 'not_found'.
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

  IF p_reason = 'legal_concern' AND (
       clean_email IS NULL
       OR clean_details IS NULL
       OR pg_catalog.char_length(clean_details) < 20
     ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'A legal concern needs an email address and an explanation';
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
