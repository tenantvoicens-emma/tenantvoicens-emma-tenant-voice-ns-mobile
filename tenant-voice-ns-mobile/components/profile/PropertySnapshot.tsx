import Card from "@/components/ui/Card";
import RatingMeter from "@/components/profile/RatingMeter";
import { formatRatingScore } from "@/lib/format-rating";

type PropertySnapshotProps = {
  propertyRating: RatingSummary;
};

type RatingSummary = {
  average: number | null;
  reviewCount: number;
};

export default function PropertySnapshot({
  propertyRating,
}: PropertySnapshotProps) {
  return (
    <section aria-labelledby="overall-ratings-heading">
      <Card>
        <div className="space-y-5">
          <h2
            id="overall-ratings-heading"
            className="text-2xl font-bold tracking-tight text-[#294B3A]"
          >
            Overall ratings
          </h2>
          <RatingSummary label="Property" summary={propertyRating} />
        </div>
      </Card>
    </section>
  );
}

function RatingSummary({
  label,
  summary,
}: {
  label: string;
  summary: RatingSummary;
}) {
  return (
    <section className="space-y-1" aria-label={label}>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-[#547160]">{label}</h3>
      <p className="text-3xl font-bold text-[#294B3A]">
        {summary.average === null
          ? "Not rated yet"
          : `${formatRatingScore(summary.average)}/5`}
      </p>
      <RatingMeter score={summary.average} showScore={false} />
      <p className="text-sm text-gray-500">
        Based on {summary.reviewCount} {summary.reviewCount === 1 ? "review" : "reviews"}
      </p>
    </section>
  );
}