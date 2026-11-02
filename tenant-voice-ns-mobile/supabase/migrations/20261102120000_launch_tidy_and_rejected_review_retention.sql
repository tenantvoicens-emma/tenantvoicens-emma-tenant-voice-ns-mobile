BEGIN;

-- discover_top_properties is a read-only summary (an aggregate view, so
-- Postgres can't write through it anyway). Make the permissions say so.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.discover_top_properties FROM anon, authenticated;

-- Indexes for the foreign keys Supabase's performance advisor flagged.
-- reviews.property_id is used by every property page.
CREATE INDEX IF NOT EXISTS reviews_property_id_idx
  ON public.reviews (property_id);
CREATE INDEX IF NOT EXISTS properties_landlord_id_idx
  ON public.properties (landlord_id);
CREATE INDEX IF NOT EXISTS review_authorship_user_id_idx
  ON private.review_authorship (user_id);

-- Rejected reviews are kept privately for 24 months (for appeals and
-- recordkeeping, as the Policies page says), then deleted. A review that
-- was approved again on appeal doesn't count as rejected. A building a
-- renter added that is still hidden and no longer has any review goes too.
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
  -- Moderation history and account links are removed by ON DELETE CASCADE.
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

COMMIT;

-- Run the cleanup every night at 04:17 UTC.
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'delete-old-rejected-reviews',
  '17 4 * * *',
  'SELECT private.delete_old_rejected_reviews()'
);
