import { Star } from "lucide-react";
import { formatRatingScore } from "@/lib/format-rating";

type StarScoreProps = {
  label: string;
  score: number | null;
  labelClassName?: string;
};

// At-a-glance rating: a label, one filled star as a visual cue, and the score.
export default function StarScore({
  label,
  score,
  labelClassName = "text-gray-600",
}: StarScoreProps) {
  return (
    <p className="flex items-center gap-2 text-sm">
      <span className={labelClassName}>{label}</span>
      {score === null ? (
        <span className="text-gray-500">Not rated yet</span>
      ) : (
        <span className="inline-flex items-center gap-1 font-semibold tabular-nums text-[#2F4F46]">
          <Star className="h-4 w-4 text-amber-600" fill="currentColor" aria-hidden="true" />
          {formatRatingScore(score)}/5
        </span>
      )}
    </p>
  );
}
