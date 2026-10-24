import { Star, StarHalf } from "lucide-react";

type RatingMeterProps = {
  score: number | null;
};

export default function RatingMeter({ score }: RatingMeterProps) {
  if (score === null || !Number.isFinite(score)) {
    return <span className="text-sm text-gray-500">N/A</span>;
  }

  const clampedScore = Math.min(5, Math.max(0, score));
  const fullStars = Math.floor(clampedScore);
  const hasHalfStar = clampedScore - fullStars >= 0.25;

  return (
    <span
      role="img"
      aria-label={`${clampedScore.toFixed(1)} out of 5`}
      className="inline-flex items-center gap-2"
    >
      <span className="inline-flex text-amber-600" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => {
          if (index < fullStars) {
            return <Star key={index} className="h-4 w-4" fill="currentColor" />;
          }

          if (index === fullStars && hasHalfStar) {
            return <StarHalf key={index} className="h-4 w-4" fill="currentColor" />;
          }

          return <Star key={index} className="h-4 w-4" />;
        })}
      </span>
      <span className="whitespace-nowrap text-sm font-medium text-gray-700">
        {clampedScore.toFixed(1)} / 5
      </span>
    </span>
  );
}