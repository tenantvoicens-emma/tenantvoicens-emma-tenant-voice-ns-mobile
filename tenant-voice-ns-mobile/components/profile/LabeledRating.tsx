import RatingMeter from "@/components/profile/RatingMeter";

type LabeledRatingProps = {
  label: string;
  score: number | null;
};

// One rating per row: a fixed-width label so the star rows line up,
// then the five-star meter and score.
export default function LabeledRating({
  label,
  score,
}: LabeledRatingProps) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-28 shrink-0 text-sm font-semibold uppercase tracking-wide text-[#66706B]">
        {label}
      </span>
      {score === null ? (
        <span className="text-gray-500">Not rated yet</span>
      ) : (
        <RatingMeter score={score} />
      )}
    </div>
  );
}
