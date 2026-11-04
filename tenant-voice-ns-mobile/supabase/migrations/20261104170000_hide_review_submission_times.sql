BEGIN;

-- Apply only after the site reads published_on instead of created_at
-- (the private rentals release). From then on the public, and signed-in
-- visitors, can read every review column except the exact submission
-- time. For small rentals that time could help a landlord work out which
-- tenant wrote a review. The moderation page reads it through
-- get_review_submitted_at.
REVOKE SELECT ON public.reviews FROM anon, authenticated;
GRANT SELECT (
  id,
  property_id,
  review_text,
  occupancy_duration,
  would_live_again,
  status,
  moderator_edited,
  landlord_on_site,
  published_on
) ON public.reviews TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
