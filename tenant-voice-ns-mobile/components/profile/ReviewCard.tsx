import Card from "@/components/ui/Card";
import Link from "next/link";
import RatingMeter from "@/components/profile/RatingMeter";
import { Review } from "@/types/review";

type ReviewCardProps = {
  review: Review;
};

export default function ReviewCard({
  review,
}: ReviewCardProps) {
  const reviewDate = review.createdAt ? new Date(review.createdAt) : null;
  const formattedDate = reviewDate && !Number.isNaN(reviewDate.getTime())
    ? new Intl.DateTimeFormat("en-CA", {
        dateStyle: "medium",
        timeZone: "UTC",
      }).format(reviewDate)
    : null;

  return (
    <Card>
      <div className="space-y-3">
        <p className="font-bold">
          Reviewed {formattedDate ?? "Date unavailable"}
        </p>

        <p className="text-sm text-gray-500">
          Resident For: {review.occupancyPeriod}
        </p>

        {review.wouldLiveAgain && (
          <p className="text-sm text-gray-500">
            Would live here again: {review.wouldLiveAgain}
          </p>
        )}

        {review.propertyName && (
          <p className="text-sm">
            Property: <Link href={`/properties/${review.propertySlug}`} className="font-medium text-[#2F4F46] underline">{review.propertyName}</Link>
          </p>
        )}

        <p>{review.reviewText}</p>

        {review.propertyRatings && review.propertyRatings.length > 0 && (
          <ReviewRatingGroup title="Property ratings" ratings={review.propertyRatings} />
        )}
        {review.landlordRatings && review.landlordRatings.length > 0 && (
          <ReviewRatingGroup title="Landlord ratings" ratings={review.landlordRatings} />
        )}
      </div>
    </Card>
  );
}

function ReviewRatingGroup({
  title,
  ratings,
}: {
  title: string;
  ratings: NonNullable<Review["propertyRatings"]>;
}) {
  return (
    <section className="space-y-2 border-t border-[#DEDCD5] pt-3">
      <h3 className="text-sm font-semibold text-[#2F4F46]">{title}</h3>
      <ul className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        {ratings.map((rating) => (
          <li key={rating.id} className="flex items-center justify-between gap-2">
            <span>{rating.category}</span>
            <RatingMeter score={rating.score} />
          </li>
        ))}
      </ul>
    </section>
  );
}
