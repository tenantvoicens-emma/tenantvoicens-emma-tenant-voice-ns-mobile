// Each review can carry an "overall" star rating for the building and for
// the landlord, stored alongside the detailed categories.
export const OVERALL_CATEGORY = "overall";

type StoredRating = {
  category: string;
  score: string | number | null;
};

export function parseRatingScore(value: string | number | null) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (!value || ["na", "n/a"].includes(value.trim().toLowerCase())) {
    return null;
  }
  const score = Number(value);
  return Number.isFinite(score) ? score : null;
}

// A review's overall score: the reviewer's own overall stars when they gave
// them, otherwise the average of their detailed ratings (older reviews only
// have those). Null when neither was given.
export function overallScore(ratings: StoredRating[] | null | undefined) {
  const rows = ratings ?? [];
  const overall = rows.find((rating) => rating.category === OVERALL_CATEGORY);
  const overallValue = overall ? parseRatingScore(overall.score) : null;
  if (overallValue !== null) {
    return overallValue;
  }

  const scores = detailedRatings(rows)
    .map((rating) => parseRatingScore(rating.score))
    .filter((score): score is number => score !== null);
  return scores.length === 0
    ? null
    : scores.reduce((total, score) => total + score, 0) / scores.length;
}

export function detailedRatings<T extends StoredRating>(
  ratings: T[] | null | undefined
): T[] {
  return (ratings ?? []).filter((rating) => rating.category !== OVERALL_CATEGORY);
}

export function formatCategory(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
