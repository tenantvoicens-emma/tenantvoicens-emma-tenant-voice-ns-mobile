// The unfinished review form, saved as the renter types so leaving and
// coming back (a "Back to your review" link, Back, or a reload) picks up
// where they left off. Links that start a review on purpose (the Review
// pill, "Share Your Experience") call startFreshReview() to clear it.

export type ReviewDraft = {
  propertySlug: string | null;
  searchTerm: string;
  occupancyDuration: string;
  wouldLiveAgain: string;
  reviewText: string;
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

export function startFreshReview() {
  writeDraft(null);
}
