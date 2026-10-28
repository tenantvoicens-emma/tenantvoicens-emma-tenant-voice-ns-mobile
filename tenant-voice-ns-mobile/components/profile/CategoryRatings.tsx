import Card from "@/components/ui/Card";
import { Rating } from "@/types/rating";
import { formatRatingScore } from "@/lib/format-rating";

type CategoryRatingsProps = {
  ratings: Rating[];
  title?: string;
};

export default function CategoryRatings({
  ratings,
  title = "Category Ratings",
}: CategoryRatingsProps) {
  return (
    <Card>
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-[#294B3A]">{title}</h2>

        <div className="space-y-2">
          {ratings.length === 0 ? (
            <p className="text-sm text-gray-500">No ratings yet.</p>
          ) : (
            ratings.map((rating) => (
              <RatingRow
                key={rating.id}
                label={rating.category}
                score={rating.score}
              />
            ))
          )}
        </div>
      </div>
    </Card>
  );
}

function RatingRow({
  label,
  score,
}: {
  label: string;
  score: number | null;
}) {
  return (
    <div className="flex justify-between border-b border-[#EEECE6] pb-2 last:border-b-0 last:pb-0">
      <span>{label}</span>
      <span className="font-semibold tabular-nums">
        {score === null ? "N/A" : `${formatRatingScore(score)}/5`}
      </span>
    </div>
  );
}