BEGIN;

-- "Report this review": anyone can flag a published review. Reports are
-- private: visitors can send one but never read any, and only the
-- moderator can see them and close them. A reported review stays up until
-- the moderator decides.

CREATE TABLE IF NOT EXISTS private.review_reports (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  review_id bigint NOT NULL
    REFERENCES public.reviews(id) ON DELETE CASCADE,
  reason text NOT NULL
    CHECK (reason IN (
      'personal_info',
      'false_or_misleading',
      'harassment_or_hate',
      'spam',
      'legal_concern',
      'other'
    )),
  details text
    CHECK (details IS NULL OR pg_catalog.char_length(details) <= 1000),
  contact_email text
    CHECK (contact_email IS NULL OR (
      pg_catalog.char_length(contact_email) <= 254
      AND contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    )),
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'dismissed', 'actioned')),
  resolution_note text
    CHECK (resolution_note IS NULL OR pg_catalog.char_length(resolution_note) <= 500),
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  resolved_at timestamptz,
  CHECK ((status = 'open') = (resolved_at IS NULL))
);

CREATE INDEX IF NOT EXISTS review_reports_review_id_idx
  ON private.review_reports (review_id);
CREATE INDEX IF NOT EXISTS review_reports_open_idx
  ON private.review_reports (created_at)
  WHERE status = 'open';

ALTER TABLE private.review_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.review_reports
  FROM PUBLIC, anon, authenticated, service_role;

-- Its own hourly limit, so reporting doesn't use up the review form's.
CREATE TABLE IF NOT EXISTS private.review_report_limits (
  ip_fingerprint text PRIMARY KEY
    CHECK (ip_fingerprint ~ '^[a-f0-9]{64}$'),
  window_started_at timestamptz NOT NULL,
  request_count integer NOT NULL CHECK (request_count > 0),
  updated_at timestamptz NOT NULL
);

ALTER TABLE private.review_report_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.review_report_limits
  FROM PUBLIC, anon, authenticated, service_role;

-- The private schema is out of visitors' reach anyway; this clears
-- Supabase's "RLS disabled" warning for the review form's limit table.
ALTER TABLE private.review_submission_limits ENABLE ROW LEVEL SECURITY;

-- Saves a report. Called only by the server (app/api/review-reports),
-- after its security check, with a one-way fingerprint of the sender's IP
-- address. Returns 'submitted', 'rate_limited' or 'not_found' (the review
-- isn't published).
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

  RETURN 'submitted';
END;
$function$;

REVOKE ALL ON FUNCTION public.submit_review_report(bigint, text, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_review_report(bigint, text, text, text, text)
  TO service_role;

-- Reports for the moderator: open ones (p_open true, oldest first) or
-- closed ones (newest first, last 200), with the review they're about.
CREATE OR REPLACE FUNCTION public.get_review_reports(p_open boolean)
RETURNS TABLE (
  report_id bigint,
  review_id bigint,
  reason text,
  details text,
  contact_email text,
  status text,
  resolution_note text,
  created_at timestamptz,
  resolved_at timestamptz,
  review_text text,
  review_status text,
  moderator_edited boolean,
  property_name text,
  property_slug text,
  property_address text,
  property_city text,
  is_small_rental boolean
)
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
      MESSAGE = 'Only the configured moderator can read reports';
  END IF;

  RETURN QUERY
  SELECT
    report.id,
    report.review_id,
    report.reason,
    report.details,
    report.contact_email,
    report.status,
    report.resolution_note,
    report.created_at,
    report.resolved_at,
    review.review_text,
    review.status,
    review.moderator_edited,
    property.name,
    property.slug,
    property.address,
    property.city,
    property.is_small_rental
  FROM private.review_reports AS report
  JOIN public.reviews AS review ON review.id = report.review_id
  LEFT JOIN public.properties AS property ON property.id = review.property_id
  WHERE (report.status = 'open') = p_open
  ORDER BY
    CASE WHEN p_open THEN report.created_at END ASC,
    CASE WHEN NOT p_open THEN report.resolved_at END DESC,
    report.id
  LIMIT CASE WHEN p_open THEN NULL ELSE 200 END;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_review_reports(boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_review_reports(boolean)
  TO authenticated;

-- How many reports are open, for the badge on the Moderation link.
CREATE OR REPLACE FUNCTION public.count_open_review_reports()
RETURNS integer
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
      MESSAGE = 'Only the configured moderator can count reports';
  END IF;

  RETURN (
    SELECT pg_catalog.count(*)::integer
    FROM private.review_reports
    WHERE status = 'open'
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.count_open_review_reports()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.count_open_review_reports()
  TO authenticated;

-- Closes every open report on a review: 'dismissed' (the review stays as
-- it is) or 'actioned' (the moderator unpublished or edited it). Returns
-- how many were closed.
CREATE OR REPLACE FUNCTION public.resolve_review_reports(
  p_review_id bigint,
  p_resolution text,
  p_note text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  clean_note text := NULLIF(pg_catalog.btrim(COALESCE(p_note, '')), '');
  closed_count integer;
BEGIN
  IF pg_catalog.lower(COALESCE((SELECT auth.jwt()) ->> 'email', '')) <>
    'tenantvoicens@gmail.com' THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Only the configured moderator can close reports';
  END IF;

  IF p_resolution IS NULL OR p_resolution NOT IN ('dismissed', 'actioned') THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Resolution must be dismissed or actioned';
  END IF;

  UPDATE private.review_reports
  SET status = p_resolution,
      resolution_note = clean_note,
      resolved_at = pg_catalog.now()
  WHERE review_id = p_review_id
    AND status = 'open';
  GET DIAGNOSTICS closed_count = ROW_COUNT;

  RETURN closed_count;
END;
$function$;

REVOKE ALL ON FUNCTION public.resolve_review_reports(bigint, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_review_reports(bigint, text, text)
  TO authenticated;

-- Closed reports (and any contact email in them) are deleted 24 months
-- after they were closed, as the Policies page says.
CREATE OR REPLACE FUNCTION private.delete_old_review_reports()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM private.review_reports
  WHERE status <> 'open'
    AND resolved_at < pg_catalog.now() - interval '24 months';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$function$;

REVOKE ALL ON FUNCTION private.delete_old_review_reports()
  FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;

-- Nightly, just after the rejected-review cleanup.
SELECT cron.schedule(
  'delete-old-review-reports',
  '27 4 * * *',
  'SELECT private.delete_old_review_reports()'
);
