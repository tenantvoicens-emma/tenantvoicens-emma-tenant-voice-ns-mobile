// The unfinished review form, saved as the renter types so leaving and
// coming back (the Review pill, Back, or a reload) picks up
// where they left off. Links that start a review on purpose (the Review
// pill, "Share Your Experience") go through StartReviewLink, which asks
// before discarding a draft with anything typed or rated in it.

import { isRentalKind } from "@/lib/rental-kind";

// A property the renter is adding because it isn't listed.
export type NewBuilding = {
  address: string;
  city: string;
  name: string;
  // A RentalKind, or "" until the renter answers "What did you rent?".
  rentalKind: string;
};

export function isNewBuildingComplete(
  building: NewBuilding | null | undefined
): building is NewBuilding {
  return Boolean(
    building &&
      /^\s*\d/.test(building.address) &&
      building.address.trim().length >= 3 &&
      building.city.trim().length >= 2 &&
      isRentalKind(building.rentalKind)
  );
}

// Drafts saved before November 4, 2026 had a "4 or more units" checkbox
// instead of the rental kind.
export function restoreNewBuilding(saved: unknown): NewBuilding | null {
  if (!saved || typeof saved !== "object") {
    return null;
  }
  const building = saved as Partial<NewBuilding> & { hasFourOrMoreUnits?: boolean };
  return {
    address: building.address ?? "",
    city: building.city ?? "",
    name: building.name ?? "",
    rentalKind: building.rentalKind ?? (building.hasFourOrMoreUnits ? "building" : ""),
  };
}

export type ReviewDraft = {
  propertySlug: string | null;
  // Older drafts don't have this.
  newBuilding?: NewBuilding | null;
  searchTerm: string;
  occupancyDuration: string;
  wouldLiveAgain: string;
  reviewText: string;
  // Older drafts don't have this.
  landlordOnSite?: string;
  propertyRatings: Record<string, string>;
  landlordRatings: Record<string, string>;
};

const DRAFT_KEY = "tv:review-draft";

export function readDraft(): ReviewDraft | null {
  try {
    const draft = sessionStorage.getItem(DRAFT_KEY);
    return draft ? (JSON.parse(draft) as ReviewDraft) : null;
  } catch {
    return null;
  }
}

export function writeDraft(draft: ReviewDraft | null) {
  try {
    if (draft) {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } else {
      sessionStorage.removeItem(DRAFT_KEY);
    }
  } catch {
    // Storage can be unavailable (private mode); the form still works.
  }
}

// True when the draft holds the renter's own work, not just a property
// picked for them by the link that opened the form.
export function hasUnsavedWork(draft: ReviewDraft | null): draft is ReviewDraft {
  if (!draft) {
    return false;
  }
  const hasRating = (ratings: Record<string, string>) =>
    Object.values(ratings ?? {}).some((value) => value !== "");
  return (
    draft.reviewText.trim() !== "" ||
    Boolean(draft.newBuilding?.address.trim() || draft.newBuilding?.name.trim()) ||
    draft.occupancyDuration !== "" ||
    draft.wouldLiveAgain !== "" ||
    Boolean(draft.landlordOnSite) ||
    hasRating(draft.propertyRatings) ||
    hasRating(draft.landlordRatings)
  );
}

// The query parameter that opens the review form ready to add a building
// that isn't listed. Its value is what the renter searched for.
export const ADD_BUILDING_PARAM = "add-building";

// The review form's address: for a specific property, ready to add a new
// building, or blank.
export function reviewFormHref({
  propertySlug,
  addBuilding,
}: {
  propertySlug?: string | null;
  addBuilding?: { searchTerm: string };
} = {}) {
  if (propertySlug) {
    return `/submit-review?property=${encodeURIComponent(propertySlug)}`;
  }
  if (addBuilding) {
    return `/submit-review?${ADD_BUILDING_PARAM}=${encodeURIComponent(addBuilding.searchTerm.trim())}`;
  }
  return "/submit-review";
}

// Shown wherever a property search comes back empty.
export const NO_SEARCH_RESULTS_HINT =
  "Try just the street name, or the street number and name.";
