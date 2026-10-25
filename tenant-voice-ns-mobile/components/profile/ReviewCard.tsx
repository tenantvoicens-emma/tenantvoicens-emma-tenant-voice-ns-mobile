import Card from "@/components/ui/Card";
import Link from "next/link";
import RatingMeter from "@/components/profile/RatingMeter";
import { Review } from "@/types/review";

type ReviewCardProps = {
  review: Review;
};

// Placeholder values the pages use when a reviewer skipped a question.
const UNANSWERED = ["Not specified", "Not answered"];

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

  const occupancyPeriod = UNANSWERED.includes(review.occupancyPeriod)
    ? null
    : review.occupancyPeriod;
  const wouldLiveAgain = review.wouldLiveAgain && !UNANSWERED.includes(review.wouldLiveAgain)
    ? review.wouldLiveAgain
    : null;

  return (
    <Card>
      <article className="space-y-4">
        <header className="space-y-1">
          {review.propertyName && (
            <h3 className="font-bold">
              <Link
                href={`/properties/${review.propertySlug}`}
                className="text-[#2F4F46] underline decoration-[#2F4F46]/30 underline-offset-4 hover:decoration-[#2F4F46]"
              >
                {review.propertyName}
              </Link>
            </h3>
          )}
          <p className="text-sm text-[#66706B]">
            Reviewed {formattedDate ?? "date unavailable"}
          </p>
        </header>

        {(occupancyPeriod || wouldLiveAgain) && (
          <div className="flex flex-wrap gap-2">
            {occupancyPeriod && (
              <ReviewDetail label="Lived here" value={occupancyPeriod} />
            )}
            {wouldLiveAgain && (
              <ReviewDetail
                label="Would live here again"
                value={wouldLiveAgain}
                tone={wouldLiveAgain === "Yes" ? "positive" : wouldLiveAgain === "No" ? "negative" : "neutral"}
              />
            )}
          </div>
        )}

        <p className="whitespace-pre-line leading-relaxed text-gray-800">
          {review.reviewText}
        </p>

        {review.propertyRatings && review.propertyRatings.length > 0 && (
          <ReviewRatingGroup title="Property" ratings={review.propertyRatings} />
        )}
        {review.landlordRatings && review.landlordRatings.length > 0 && (
          <ReviewRatingGroup title="Landlord" ratings={review.landlordRatings} />
        )}
      </article>
    </Card>
  );
}

const detailTones = {
  positive: "bg-[#EEF5EB] text-[#2F4F46]",
  negative: "bg-[#FBEDE9] text-[#8A3B2B]",
  neutral: "bg-[#F3F2EE] text-[#2F4F46]",
};

function ReviewDetail({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: keyof typeof detailTones;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm ${detailTones[tone]}`}>
      <span className="opacity-75">{label}</span>
      <span className="font-semibold">{value}</span>
    </span>
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
    <section className="space-y-1 border-t border-[#DEDCD5] pt-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-[#66706B]">
        {title} ratings
      </h4>
      <ul className="divide-y divide-[#EEECE6] text-sm">
        {ratings.map((rating) => (
          <li key={rating.id} className="flex items-center justify-between gap-3 py-2">
            <span className="min-w-0 text-gray-700">{rating.category}</span>
            <span className="shrink-0">
              <RatingMeter score={rating.score} />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
