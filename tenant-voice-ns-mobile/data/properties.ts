import { Property } from "@/types/property";

export const harbourview: Property = {
  id: "harbourview",

  slug: "harbourview",

  name: "Harbourview Apartments",

  address: "123 Example Street",

  city: "Halifax, Nova Scotia",

  overallRating: 4.2,

  reviewCount: 87,

  wouldLiveAgain: 78,

  strengths: [
    "Cleanliness",
    "Safety",
    "Common Areas",
  ],

  concerns: [
    "Communication",
    "Repair Speed",
    "Noise Levels",
  ],
};

export const greenwood: Property = {
  id: "greenwood",

  slug: "greenwood",

  name: "Greenwood Towers",

  address: "456 Fiction Avenue",

  city: "Dartmouth, Nova Scotia",

  overallRating: 3.8,

  reviewCount: 42,

  wouldLiveAgain: 64,

  strengths: [
    "Location",
    "Parking",
    "Maintenance",
  ],

  concerns: [
    "Noise",
    "Communication",
    "Heating",
  ],
};

export const questtowers: Property = {
  id: "questtowers",

  slug: "questtowers",

  name: "Quest Towers",

  address: "56 Example Street",

  city: "Dartmouth, Nova Scotia",

  overallRating: 3.9,

  reviewCount: 9,

  wouldLiveAgain: 1,

  strengths: [
    "Cleanliness",
    "Safety",
    "Common Areas",
  ],

  concerns: [
    "Communication",
    "Repair Speed",
    "Noise Levels",
  ],
};

export const properties = [
  harbourview,
  greenwood,
  questtowers,
];

export function getPropertyBySlug(
  slug: string
) {
  return properties.find(
    (property) => property.slug === slug
  );
}