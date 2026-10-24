BEGIN;

REVOKE ALL ON FUNCTION public.submit_review(
  bigint, text, text, text, jsonb, jsonb
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.submit_review(
  bigint, text, text, text, jsonb, jsonb
) TO service_role;

DROP POLICY IF EXISTS reviews_admin_read_all
  ON public.reviews;
CREATE POLICY reviews_admin_read_all
  ON public.reviews
  FOR SELECT
  TO authenticated
  USING (
    pg_catalog.lower(COALESCE((SELECT auth.jwt()) ->> 'email', '')) =
      'tenantvoicens@gmail.com'
  );

DROP POLICY IF EXISTS property_ratings_admin_read_all
  ON public.property_ratings;
CREATE POLICY property_ratings_admin_read_all
  ON public.property_ratings
  FOR SELECT
  TO authenticated
  USING (
    pg_catalog.lower(COALESCE((SELECT auth.jwt()) ->> 'email', '')) =
      'tenantvoicens@gmail.com'
  );

DROP POLICY IF EXISTS landlord_ratings_admin_read_all
  ON public.landlord_ratings;
CREATE POLICY landlord_ratings_admin_read_all
  ON public.landlord_ratings
  FOR SELECT
  TO authenticated
  USING (
    pg_catalog.lower(COALESCE((SELECT auth.jwt()) ->> 'email', '')) =
      'tenantvoicens@gmail.com'
  );

CREATE OR REPLACE FUNCTION public.moderate_review(
  p_review_id bigint,
  p_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF pg_catalog.lower(COALESCE((SELECT auth.jwt()) ->> 'email', '')) <>
    'tenantvoicens@gmail.com' THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Only the configured moderator can review submissions';
  END IF;

  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Moderation status must be approved or rejected';
  END IF;

  UPDATE public.reviews
  SET status = p_status
  WHERE id = p_review_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Pending review was not found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.moderate_review(bigint, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.moderate_review(bigint, text)
  TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;