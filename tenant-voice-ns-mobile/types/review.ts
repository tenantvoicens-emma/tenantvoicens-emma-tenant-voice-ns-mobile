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

  propertyRatings?: Rating[];

  landlordRatings?: Rating[];
};
