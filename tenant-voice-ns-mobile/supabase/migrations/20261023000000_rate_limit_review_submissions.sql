BEGIN;

CREATE SCHEMA IF NOT EXISTS private AUTHORIZATION postgres;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS private.review_submission_limits (
  ip_fingerprint text PRIMARY KEY
    CHECK (ip_fingerprint ~ '^[a-f0-9]{64}$'),
  window_started_at timestamptz NOT NULL,
  request_count integer NOT NULL CHECK (request_count > 0),
  updated_at timestamptz NOT NULL
);

REVOKE ALL ON TABLE private.review_submission_limits
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.consume_review_submission_limit(
  p_ip_fingerprint text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_count integer;
BEGIN
  IF p_ip_fingerprint IS NULL
     OR p_ip_fingerprint !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Invalid rate-limit fingerprint';
  END IF;

  INSERT INTO private.review_submission_limits AS limits (
    ip_fingerprint,
    window_started_at,
    request_count,
    updated_at
  )
  VALUES (
    p_ip_fingerprint,
    pg_catalog.now(),
    1,
    pg_catalog.now()
  )
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

  DELETE FROM private.review_submission_limits
  WHERE ip_fingerprint IN (
    SELECT stale.ip_fingerprint
    FROM private.review_submission_limits AS stale
    WHERE stale.updated_at < pg_catalog.now() - interval '48 hours'
    ORDER BY stale.updated_at
    LIMIT 100
  );

  RETURN current_count <= 5;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_review_submission_limit(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_review_submission_limit(text)
  TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;