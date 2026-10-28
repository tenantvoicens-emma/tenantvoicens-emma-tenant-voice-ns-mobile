import { Rating } from "@/types/rating";

export type Review = {
  id: string | number;

  propertySlug: string;

  rating?: number;

  occupancyPeriod: string;

  reviewText: string;

  wouldLiveAgain?: string;

  createdAt?: string;

  propertyName?: string;

  // Detailed category ratings; the overall scores are kept separately.
  propertyRatings?: Rating[];

  landlordRatings?: Rating[];

  // The reviewer's overall stars, or the average of their detailed ratings
  // when they didn't give any (see lib/ratings).
  propertyOverall?: number | null;

  landlordOverall?: number | null;
};
