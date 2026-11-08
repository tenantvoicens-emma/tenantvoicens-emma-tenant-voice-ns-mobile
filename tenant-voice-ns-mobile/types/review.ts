import { Rating } from "@/types/rating";

// Reviews are about the property only. Landlords and property managers are
// not rated or named, so there are no landlord fields here.
export type Review = {
  id: string | number;

  propertySlug: string;

  rating?: number;

  occupancyPeriod: string;

  reviewText: string;

  wouldLiveAgain?: string;

  // A moderator removed words that broke the guidelines.
  moderatorEdited?: boolean;

  // The date shown publicly (reviews.published_on, YYYY-MM-DD). For small
  // rentals it's January 1 of the year written, and only the year is shown.
  publishedOn?: string;

  yearOnly?: boolean;

  propertyName?: string;

  // Problems the reviewer ticked from the fixed list (see lib/review-issues).
  issues?: string[];

  // Detailed category ratings; the overall score is kept separately.
  propertyRatings?: Rating[];

  // The reviewer's overall stars, or the average of their detailed ratings
  // when they didn't give any (see lib/ratings).
  propertyOverall?: number | null;
};
