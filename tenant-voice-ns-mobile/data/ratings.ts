import { Rating } from "@/types/rating";

export const ratings: Rating[] = [
  {
    id: "r1",
    propertySlug: "harbourview",
    category: "Cleanliness",
    score: 4.8,
  },
  {
    id: "r2",
    propertySlug: "harbourview",
    category: "Safety",
    score: 4.5,
  },
  {
    id: "r3",
    propertySlug: "harbourview",
    category: "Common Areas",
    score: 4.6,
  },
  {
    id: "r4",
    propertySlug: "harbourview",
    category: "Communication",
    score: 2.8,
  },
  {
    id: "r5",
    propertySlug: "harbourview",
    category: "Repair Speed",
    score: 3.2,
  },
  {
    id: "r6",
    propertySlug: "harbourview",
    category: "Noise Levels",
    score: 3.1,
  },

  {
    id: "r7",
    propertySlug: "greenwood",
    category: "Location",
    score: 4.7,
  },
  {
    id: "r8",
    propertySlug: "greenwood",
    category: "Parking",
    score: 4.5,
  },
  {
    id: "r9",
    propertySlug: "greenwood",
    category: "Maintenance",
    score: 3.9,
  },

  {
    id: "r10",
    propertySlug: "questtowers",
    category: "Dragon Defense",
    score: 2.1,
  },
  {
    id: "r11",
    propertySlug: "questtowers",
    category: "Quest Availability",
    score: 4.9,
  },
];

export function getRatingsByPropertySlug(
  slug: string
) {
  return ratings.filter(
    (rating) =>
      rating.propertySlug === slug
  );
}