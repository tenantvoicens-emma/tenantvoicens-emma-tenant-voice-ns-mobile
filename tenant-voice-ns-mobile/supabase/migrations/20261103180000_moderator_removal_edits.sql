BEGIN;

-- Moderator edits: when a review breaks the guidelines in a small way, the
-- moderator may remove only the offending words (a name, an identifying
-- detail, an accusation stated as fact) and publish the rest. Words can
-- only be removed, never added, changed or reordered; the database checks
-- that against the writer's original text. The original is kept privately
-- and edited reviews are flagged publicly so readers know.

-- Public flag, shown as "Edited by a moderator". The table-level SELECT
-- grant already covers new columns; granted explicitly for clarity.
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS moderator_edited boolean NOT NULL DEFAULT false;

GRANT SELECT (moderator_edited) ON public.reviews TO anon, authenticated;

-- The writer's original words, saved the first time a review is edited.
-- Private: reachable only through the moderator-only function below.
CREATE TABLE IF NOT EXISTS private.review_original_texts (
  review_id bigint PRIMARY KEY
    REFERENCES public.reviews(id) ON DELETE CASCADE,
  original_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now()
);

ALTER TABLE private.review_original_texts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.review_original_texts
  FROM PUBLIC, anon, authenticated, service_role;

-- Marks the moderation decisions that also edited the text.
ALTER TABLE private.moderation_events
  ADD COLUMN IF NOT EXISTS text_edited boolean NOT NULL DEFAULT false;

-- True when p_edited is p_original with whole words removed and nothing
-- else changed: its words, split on whitespace, appear in p_original in
-- the same order. Line breaks and spacing may change; an empty result
-- doesn't count. Mirrored in lib/moderator-edit.ts for instant feedback.
CREATE OR REPLACE FUNCTION private.is_removal_only(
  p_original text,
  p_edited text
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO ''
AS $function$
DECLARE
  original_words text[];
  edited_words text[];
  edited_count integer;
  next_word integer := 1;
  word text;
BEGIN
  IF pg_catalog.btrim(COALESCE(p_edited, '')) = '' THEN
    RETURN false;
  END IF;

  original_words := pg_catalog.regexp_split_to_array(
    pg_catalog.btrim(COALESCE(p_original, '')), '\s+'
  );
  edited_words := pg_catalog.regexp_split_to_array(
    pg_catalog.btrim(p_edited), '\s+'
  );
  edited_count := pg_catalog.array_length(edited_words, 1);

  FOREACH word IN ARRAY original_words LOOP
    IF next_word <= edited_count AND word = edited_words[next_word] THEN
      next_word := next_word + 1;
    END IF;
  END LOOP;

  RETURN next_word > edited_count;
END;
$function$;

REVOKE ALL ON FUNCTION private.is_removal_only(text, text)
  FROM PUBLIC, anon, authenticated;

-- Adds p_edited_text: publish (or keep published) the review with words
-- removed. Only allowed with p_status 'approved', including on a review
-- that's already approved. Restoring the original text exactly clears the
-- edit. Existing callers that don't pass it keep working.
DROP FUNCTION IF EXISTS public.moderate_review(bigint, text, text);

CREATE FUNCTION public.moderate_review(
  p_review_id bigint,
  p_status text,
  p_note text DEFAULT NULL,
  p_edited_text text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  moderator_email text :=
    pg_catalog.lower(COALESCE((SELECT auth.jwt()) ->> 'email', ''));
  current_status text;
  current_text text;
  review_property_id bigint;
  original_text text;
  clean_note text := NULLIF(pg_catalog.btrim(COALESCE(p_note, '')), '');
  edited_text text := NULLIF(pg_catalog.btrim(COALESCE(p_edited_text, '')), '');
  is_editing boolean := p_edited_text IS NOT NULL;
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

  IF is_editing AND p_status <> 'approved' THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Edited text can only be saved when approving';
  END IF;

  SELECT status, property_id, review_text
  INTO current_status, review_property_id, current_text
  FROM public.reviews
  WHERE id = p_review_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Review was not found';
  END IF;

  IF is_editing AND edited_text IS NOT DISTINCT FROM pg_catalog.btrim(current_text) THEN
    -- Nothing changed in the text: treat it as a plain decision.
    is_editing := false;
  END IF;

  IF current_status = p_status AND NOT is_editing THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Review already has that status';
  END IF;

  IF is_editing THEN
    SELECT saved.original_text INTO original_text
    FROM private.review_original_texts AS saved
    WHERE saved.review_id = p_review_id;

    original_text := COALESCE(original_text, current_text);

    IF NOT private.is_removal_only(original_text, edited_text) THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023',
        MESSAGE = 'Moderator edits can only remove words from the original review';
    END IF;

    IF edited_text = pg_catalog.btrim(original_text) THEN
      -- Back to the writer's own words: no longer an edited review.
      DELETE FROM private.review_original_texts
      WHERE review_id = p_review_id;

      UPDATE public.reviews
      SET review_text = original_text,
          moderator_edited = false
      WHERE id = p_review_id;
    ELSE
      INSERT INTO private.review_original_texts (review_id, original_text)
      VALUES (p_review_id, original_text)
      ON CONFLICT (review_id) DO NOTHING;

      UPDATE public.reviews
      SET review_text = edited_text,
          moderator_edited = true
      WHERE id = p_review_id;
    END IF;
  END IF;

  IF current_status <> p_status THEN
    UPDATE public.reviews
    SET status = p_status
    WHERE id = p_review_id;
  END IF;

  IF p_status = 'approved' THEN
    UPDATE public.properties
    SET is_listed = true
    WHERE id = review_property_id
      AND NOT is_listed;
  END IF;

  INSERT INTO private.moderation_events (
    review_id, from_status, to_status, note, moderator_email, text_edited
  )
  VALUES (
    p_review_id, current_status, p_status, clean_note, moderator_email, is_editing
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.moderate_review(bigint, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.moderate_review(bigint, text, text, text)
  TO authenticated;

-- History now says which decisions edited the text.
DROP FUNCTION IF EXISTS public.get_moderation_history(bigint[]);

CREATE FUNCTION public.get_moderation_history(p_review_ids bigint[])
RETURNS TABLE (
  review_id bigint,
  from_status text,
  to_status text,
  note text,
  text_edited boolean,
  created_at timestamptz
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
      MESSAGE = 'Only the configured moderator can read moderation history';
  END IF;

  RETURN QUERY
  SELECT
    event.review_id,
    event.from_status,
    event.to_status,
    event.note,
    event.text_edited,
    event.created_at
  FROM private.moderation_events AS event
  WHERE event.review_id = ANY (p_review_ids)
  ORDER BY event.review_id, event.created_at, event.id;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_moderation_history(bigint[])
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_moderation_history(bigint[])
  TO authenticated;

-- The writer's original words for edited reviews, for the moderator only.
CREATE FUNCTION public.get_review_originals(p_review_ids bigint[])
RETURNS TABLE (review_id bigint, original_text text)
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
      MESSAGE = 'Only the configured moderator can read original review text';
  END IF;

  RETURN QUERY
  SELECT saved.review_id, saved.original_text
  FROM private.review_original_texts AS saved
  WHERE saved.review_id = ANY (p_review_ids);
END;
$function$;

REVOKE ALL ON FUNCTION public.get_review_originals(bigint[])
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_review_originals(bigint[])
  TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
