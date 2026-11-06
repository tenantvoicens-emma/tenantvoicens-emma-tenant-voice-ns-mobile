// Reasons a visitor can give for reporting a published review. The keys
// match the check on private.review_reports.reason in the database.
export const reportReasons = [
  {
    value: "personal_info",
    label: "Personal or identifying information",
    hint: "Names a private person, or details that could identify someone",
  },
  {
    value: "false_or_misleading",
    label: "False or misleading",
  },
  {
    value: "harassment_or_hate",
    label: "Harassment, threats or hateful content",
  },
  {
    value: "spam",
    label: "Spam, or not about renting here",
  },
  {
    value: "legal_concern",
    label: "Legal concern",
  },
  {
    value: "other",
    label: "Something else",
  },
] as const;

export type ReportReason = (typeof reportReasons)[number]["value"];

export const REPORT_DETAILS_LIMIT = 1000;

export function isReportReason(value: unknown): value is ReportReason {
  return reportReasons.some((reason) => reason.value === value);
}

export function reportReasonLabel(value: string) {
  return reportReasons.find((reason) => reason.value === value)?.label ?? value;
}

// Light check only; the database applies the same pattern.
export function looksLikeEmail(value: string) {
  return value.length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
}
