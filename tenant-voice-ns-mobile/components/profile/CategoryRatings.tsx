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
        <h3 className="font-bold text-[#2F4F46]">{title}</h3>

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
    <div className="flex justify-between border-b pb-2">
      <span>{label}</span>
      <span className="font-semibold tabular-nums">
        {score === null ? "N/A" : `${formatRatingScore(score)}/5`}
      </span>
    </div>
  );
}