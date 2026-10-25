BEGIN;

-- Add average property and landlord ratings to the Discover ranking.
-- Matches the property page: each review's category scores are averaged
-- first, then those per-review averages are averaged and rounded to one
-- decimal. Non-numeric scores such as 'na' are ignored.
CREATE OR REPLACE VIEW public.discover_top_properties
WITH (security_invoker = true)
AS
WITH review_scores AS (
  SELECT
    reviews.id AS review_id,
    reviews.property_id,
    (
      SELECT pg_catalog.avg(property_ratings.score::numeric)
      FROM public.property_ratings AS property_ratings
      WHERE property_ratings.review_id = reviews.id
        AND property_ratings.score ~ '^[0-9]+(\.[0-9]+)?$'
    ) AS property_score,
    (
      SELECT pg_catalog.avg(landlord_ratings.score::numeric)
      FROM public.landlord_ratings AS landlord_ratings
      WHERE landlord_ratings.review_id = reviews.id
        AND landlord_ratings.score ~ '^[0-9]+(\.[0-9]+)?$'
    ) AS landlord_score
  FROM public.reviews AS reviews
  WHERE reviews.status = 'approved'
)
SELECT
  properties.id,
  properties.slug,
  properties.name,
  properties.address,
  properties.city,
  pg_catalog.count(review_scores.review_id)::bigint AS review_count,
  pg_catalog.round(pg_catalog.avg(review_scores.property_score), 1) AS property_rating,
  pg_catalog.round(pg_catalog.avg(review_scores.landlord_score), 1) AS landlord_rating
FROM public.properties AS properties
JOIN review_scores
  ON review_scores.property_id = properties.id
GROUP BY
  properties.id,
  properties.slug,
  properties.name,
  properties.address,
  properties.city;

GRANT SELECT ON public.discover_top_properties TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
