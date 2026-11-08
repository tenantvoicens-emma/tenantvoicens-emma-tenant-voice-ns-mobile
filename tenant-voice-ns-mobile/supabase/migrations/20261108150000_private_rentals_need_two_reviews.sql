BEGIN;

-- A private rental (house, suite, room, duplex or condo) is shown only once
-- it has TWO approved reviews. With a single review, the owner can usually
-- tell who wrote it, and the address points straight at a private person.
-- Until then its page, its reviews and its ratings are not public.
-- Larger buildings are unchanged: they appear after their first approved
-- review, as before.
--
-- Three parts work together so the rule holds however a review's status
-- changes (a moderator approving or unpublishing it, or a legal-concern
-- report hiding it):
--   1. a guard that refuses to list a private rental with fewer than two
--      approved reviews,
--   2. a trigger that lists or delists a private rental as its approved
--      reviews change,
--   3. a stricter read policy, so approved reviews of an unlisted property
--      can't be read straight from the public API either.

-- 1. Guard -------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.guard_small_rental_listing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  approved_count integer;
BEGIN
  SELECT pg_catalog.count(*)::integer INTO approved_count
  FROM public.reviews AS review
  WHERE review.property_id = NEW.id
    AND review.status = 'approved';

  IF approved_count < 2 THEN
    NEW.is_listed := false;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.guard_small_rental_listing()
  FROM PUBLIC, anon, authenticated;

-- is_small_rental is a generated column, which isn't computed yet inside a
-- BEFORE trigger, so the rule reads rental_kind directly.
DROP TRIGGER IF EXISTS guard_small_rental_listing ON public.properties;
CREATE TRIGGER guard_small_rental_listing
  BEFORE UPDATE OF is_listed ON public.properties
  FOR EACH ROW
  WHEN (
    NEW.is_listed
    AND NEW.rental_kind IN ('condo', 'small_building', 'house', 'suite', 'room')
  )
  EXECUTE FUNCTION private.guard_small_rental_listing();

-- 2. List and delist as reviews change ---------------------------------------

CREATE OR REPLACE FUNCTION private.refresh_small_rental_listing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  approved_count integer;
BEGIN
  SELECT pg_catalog.count(*)::integer INTO approved_count
  FROM public.reviews AS review
  WHERE review.property_id = NEW.property_id
    AND review.status = 'approved';

  UPDATE public.properties AS property
  SET is_listed = (approved_count >= 2)
  WHERE property.id = NEW.property_id
    AND property.rental_kind IN ('condo', 'small_building', 'house', 'suite', 'room')
    AND property.is_listed IS DISTINCT FROM (approved_count >= 2);

  RETURN NULL;
END;
$function$;

REVOKE ALL ON FUNCTION private.refresh_small_rental_listing()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS refresh_small_rental_listing ON public.reviews;
CREATE TRIGGER refresh_small_rental_listing
  AFTER UPDATE OF status ON public.reviews
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION private.refresh_small_rental_listing();

-- 3. Reviews of an unlisted property aren't public ----------------------------

-- The subquery is filtered by the properties policy (listed properties
-- only), so a review is readable only while its property is listed. The
-- moderator can still read everything through their own policies.
DROP POLICY IF EXISTS reviews_read_approved ON public.reviews;
CREATE POLICY reviews_read_approved
  ON public.reviews
  FOR SELECT
  TO anon, authenticated
  USING (
    status = 'approved'
    AND EXISTS (
      SELECT 1 FROM public.properties AS property
      WHERE property.id = reviews.property_id
    )
  );

-- Apply the rule to what's already live: a private rental with fewer than
-- two approved reviews stops being listed.
UPDATE public.properties AS property
SET is_listed = false
WHERE property.is_listed
  AND property.rental_kind IN ('condo', 'small_building', 'house', 'suite', 'room')
  AND (
    SELECT pg_catalog.count(*)
    FROM public.reviews AS review
    WHERE review.property_id = property.id
      AND review.status = 'approved'
  ) < 2;

NOTIFY pgrst, 'reload schema';

COMMIT;
