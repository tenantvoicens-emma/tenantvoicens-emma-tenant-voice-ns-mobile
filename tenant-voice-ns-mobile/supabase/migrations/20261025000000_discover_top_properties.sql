BEGIN;

CREATE OR REPLACE VIEW public.discover_top_properties
WITH (security_invoker = true)
AS
SELECT
  properties.id,
  properties.slug,
  properties.name,
  properties.address,
  properties.city,
  pg_catalog.count(reviews.id)::bigint AS review_count
FROM public.properties AS properties
JOIN public.reviews AS reviews
  ON reviews.property_id = properties.id
WHERE reviews.status = 'approved'
GROUP BY
  properties.id,
  properties.slug,
  properties.name,
  properties.address,
  properties.city;

GRANT SELECT ON public.discover_top_properties TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;