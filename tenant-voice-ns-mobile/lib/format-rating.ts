// Whole numbers show as "4"; anything else rounds to one decimal, e.g. "3.5".
export function formatRatingScore(score: number) {
  const rounded = Math.round(score * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
