BEGIN;

-- A private record of every moderation decision, so a review's history
-- (approved, unpublished, approved again on appeal, ...) and the reasons
-- for each change can be looked up later. Only reachable through the
-- moderator-only functions below.
CREATE TABLE IF NOT EXISTS private.moderation_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  review_id bigint NOT NULL
    REFERENCES public.reviews(id) ON DELETE CASCADE,
  from_status text NOT NULL
    CHECK (from_status IN ('pending', 'approved', 'rejected')),
  to_status text NOT NULL
    CHECK (to_status IN ('approved', 'rejected')),
  note text
    CHECK (note IS NULL OR pg_catalog.char_length(note) <= 500),
  moderator_email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now()
);

CREATE INDEX IF NOT EXISTS moderation_events_review_id_idx
  ON private.moderation_events (review_id, created_at);

ALTER TABLE private.moderation_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.moderation_events
  FROM PUBLIC, anon, authenticated, service_role;

-- Replaces the pending-only version: a decision can now be reversed
-- (approved -> rejected to unpublish, rejected -> approved on appeal),
-- and each change is logged with an optional note. Existing callers that
-- pass only p_review_id and p_status keep working.
DROP FUNCTION IF EXISTS public.moderate_review(bigint, text);

CREATE FUNCTION public.moderate_review(
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

  SELECT status INTO current_status
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

  INSERT INTO private.moderation_events (
    review_id, from_status, to_status, note, moderator_email
  )
  VALUES (
    p_review_id, current_status, p_status, clean_note, moderator_email
  );
END;
$$;

REVOKE ALL ON FUNCTION public.moderate_review(bigint, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.moderate_review(bigint, text, text)
  TO authenticated;

-- The logged decisions for a set of reviews, oldest first. Moderator only.
CREATE OR REPLACE FUNCTION public.get_moderation_history(
  p_review_ids bigint[]
)
RETURNS TABLE (
  review_id bigint,
  from_status text,
  to_status text,
  note text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF pg_catalog.lower(COALESCE((SELECT auth.jwt()) ->> 'email', '')) <>
    'tenantvoicens@gmail.com' THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Only the configured moderator can read moderation history';
  END IF;

  RETURN QUERY
  SELECT
    event.review_id,
    event.from_status,
    event.to_status,
    event.note,
    event.created_at
  FROM private.moderation_events AS event
  WHERE event.review_id = ANY (p_review_ids)
  ORDER BY event.review_id, event.created_at, event.id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_moderation_history(bigint[])
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_moderation_history(bigint[])
  TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
