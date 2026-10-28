BEGIN;

-- Reviewers can give one overall star rating for the building and one for
-- the landlord. They're stored as an 'overall' category beside the
-- detailed ones, which become optional extras.
ALTER TABLE public.property_ratings
  DROP CONSTRAINT IF EXISTS property_rating_category_check;
ALTER TABLE public.property_ratings
  ADD CONSTRAINT property_rating_category_check
  CHECK (category IN (
    'overall', 'cleanliness', 'safety', 'common_areas', 'noise_levels',
    'parking', 'amenities', 'building_condition', 'pet_friendliness'
  ));

ALTER TABLE public.landlord_ratings
  DROP CONSTRAINT IF EXISTS landlord_rating_category_check;
ALTER TABLE public.landlord_ratings
  ADD CONSTRAINT landlord_rating_category_check
  CHECK (category IN (
    'overall', 'communication', 'repair_speed', 'professionalism',
    'lease_transparency', 'move_in_experience'
  ));

-- Matches lib/ratings overallScore: a review's score is its overall stars
-- when given, otherwise the average of its detailed scores. Those
-- per-review scores are then averaged and rounded to one decimal.
CREATE OR REPLACE VIEW public.discover_top_properties
WITH (security_invoker = true)
AS
WITH review_scores AS (
  SELECT
    reviews.id AS review_id,
    reviews.property_id,
    COALESCE(
      (
        SELECT property_ratings.score::numeric
        FROM public.property_ratings AS property_ratings
        WHERE property_ratings.review_id = reviews.id
          AND property_ratings.category = 'overall'
          AND property_ratings.score ~ '^[0-9]+(\.[0-9]+)?$'
      ),
      (
        SELECT pg_catalog.avg(property_ratings.score::numeric)
        FROM public.property_ratings AS property_ratings
        WHERE property_ratings.review_id = reviews.id
          AND property_ratings.category <> 'overall'
          AND property_ratings.score ~ '^[0-9]+(\.[0-9]+)?$'
      )
    ) AS property_score,
    COALESCE(
      (
        SELECT landlord_ratings.score::numeric
        FROM public.landlord_ratings AS landlord_ratings
        WHERE landlord_ratings.review_id = reviews.id
          AND landlord_ratings.category = 'overall'
          AND landlord_ratings.score ~ '^[0-9]+(\.[0-9]+)?$'
      ),
      (
        SELECT pg_catalog.avg(landlord_ratings.score::numeric)
        FROM public.landlord_ratings AS landlord_ratings
        WHERE landlord_ratings.review_id = reviews.id
          AND landlord_ratings.category <> 'overall'
          AND landlord_ratings.score ~ '^[0-9]+(\.[0-9]+)?$'
      )
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

NOTIFY pgrst, 'reload schema';

COMMIT;
