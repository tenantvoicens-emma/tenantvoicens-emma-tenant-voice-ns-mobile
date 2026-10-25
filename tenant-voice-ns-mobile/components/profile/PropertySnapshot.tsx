import Card from "@/components/ui/Card";
import RatingMeter from "@/components/profile/RatingMeter";
import { formatRatingScore } from "@/lib/format-rating";

type PropertySnapshotProps = {
  propertyRating: RatingSummary;
  landlordRating: RatingSummary;
};

type RatingSummary = {
  average: number | null;
  reviewCount: number;
};

export default function PropertySnapshot({
  propertyRating,
  landlordRating,
}: PropertySnapshotProps) {
  return (
    <Card>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <RatingSummary label="Property rating" summary={propertyRating} />
        <RatingSummary label="Landlord rating" summary={landlordRating} />
      </div>
    </Card>
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
      <h2 className="text-sm font-medium text-gray-600">{label}</h2>
      <p className="text-3xl font-bold text-[#2F4F46]">
        {summary.average === null
          ? "Not rated yet"
          : `${formatRatingScore(summary.average)}/5`}
      </p>
      <RatingMeter score={summary.average} />
      <p className="text-sm text-gray-500">
        Based on {summary.reviewCount} {summary.reviewCount === 1 ? "review" : "reviews"}
      </p>
    </section>
  );
}