import { Review } from "@/types/review";

export const reviews: Review[] = [
  {
    id: "review-1",

    propertySlug: "harbourview",

    rating: 4,

    occupancyPeriod: "2023–2025",

    reviewText:
      "The building was clean and generally well maintained. Maintenance requests were usually completed.",
  },

  {
    id: "review-2",

    propertySlug: "harbourview",

    rating: 3,

    occupancyPeriod: "2021–2023",

    reviewText:
      "Good location and quiet building. Communication could be slow at times.",
  },

  {
    id: "review-3",

    propertySlug: "greenwood",

    rating: 5,

    occupancyPeriod: "2024–Present",

    reviewText:
      "Friendly staff and excellent parking availability.",
  },

  {
    id: "review-4",

    propertySlug: "questtowers",

    rating: 2,

    occupancyPeriod: "2025–Present",

    reviewText:
      "Many adventures. Not enough elevators. Occasional dragon encounters.",
  },
];

export function getReviewsByPropertySlug(
  slug: string
) {
  return reviews.filter(
    (review) =>
      review.propertySlug === slug
  );
}