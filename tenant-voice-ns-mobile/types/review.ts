import { Rating } from "@/types/rating";

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

  // Small rentals: whether the landlord lived there too ("yes", "no",
  // "unsure").
  landlordOnSite?: string | null;

  propertyName?: string;

  // Detailed category ratings; the overall scores are kept separately.
  propertyRatings?: Rating[];

  landlordRatings?: Rating[];

  // The reviewer's overall stars, or the average of their detailed ratings
  // when they didn't give any (see lib/ratings).
  propertyOverall?: number | null;

  landlordOverall?: number | null;
};
