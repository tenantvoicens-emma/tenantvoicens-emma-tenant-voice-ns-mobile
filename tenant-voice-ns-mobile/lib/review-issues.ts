// Facts about the property a reviewer can tick instead of (or as well as)
// writing about them. Each one describes the place, never a person, so a
// review can be useful without accusing anyone. The `value` keys are what's
// stored (reviews.issues) and must match the check on that column in the
// database.
export const reviewIssues = [
  { value: "mice_rats", label: "Mice or rats" },
  { value: "bedbugs_pests", label: "Bedbugs or other pests" },
  { value: "mold_moisture", label: "Mold or persistent dampness" },
  { value: "water_leaks", label: "Water leaks" },
  { value: "no_heat", label: "Heat not working" },
  { value: "no_hot_water", label: "No hot water" },
  { value: "repairs_over_14_days", label: "Repairs took more than 14 days" },
  { value: "broken_security", label: "Broken locks, doors or entry system" },
  { value: "fire_safety", label: "Fire safety problems (alarms, exits)" },
  { value: "noise_problems", label: "Constant noise problems" },
] as const;

export type ReviewIssue = (typeof reviewIssues)[number]["value"];

export const MAX_REVIEW_ISSUES = reviewIssues.length;

const issueValues: ReadonlySet<string> = new Set(
  reviewIssues.map((issue) => issue.value)
);

export function isReviewIssue(value: unknown): value is ReviewIssue {
  return typeof value === "string" && issueValues.has(value);
}

export function reviewIssueLabel(value: string) {
  return reviewIssues.find((issue) => issue.value === value)?.label ?? value;
}
