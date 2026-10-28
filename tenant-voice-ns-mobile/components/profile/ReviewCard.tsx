import Card from "@/components/ui/Card";
import Link from "next/link";
import RatingMeter from "@/components/profile/RatingMeter";
import LabeledRating from "@/components/profile/LabeledRating";
import ClampedReviewText from "@/components/profile/ClampedReviewText";
import { getPropertyHref } from "@/lib/navigation";
import { Review } from "@/types/review";

type ReviewCardProps = {
  review: Review;
  // Compact cards swap the per-category breakdown for one overall
  // property score and one landlord score.
  compact?: boolean;
};

// Placeholder values the pages use when a reviewer skipped a question.
const UNANSWERED = ["Not specified", "Not answered"];

export default function ReviewCard({
  review,
  compact = false,
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

  // Compact cards link, as a whole, to this review on its property page.
  const fullReviewHref = compact && review.propertySlug
    ? `${getPropertyHref(review.propertySlug, "")}#${reviewAnchorId(review.id)}`
    : null;

  const card = (
    <Card>
      <article className="space-y-4">
        <header className="space-y-1">
          {review.propertyName && (
            <h3 className="text-xl font-bold text-[#294B3A]">
              {fullReviewHref ? (
                review.propertyName
              ) : (
                <Link
                  href={`/properties/${review.propertySlug}`}
                  className="underline decoration-[#2F4F46]/30 underline-offset-4 hover:decoration-[#2F4F46]"
                >
                  {review.propertyName}
                </Link>
              )}
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

        {compact ? (
          <ClampedReviewText text={review.reviewText} />
        ) : (
          <p className="whitespace-pre-line leading-relaxed text-gray-800">
            {review.reviewText}
          </p>
        )}

        {compact ? (
          <div className="space-y-1.5 border-t border-[#DEDCD5] pt-3">
            <LabeledRating label="Property" score={averageScore(review.propertyRatings)} />
            <LabeledRating label="Landlord" score={averageScore(review.landlordRatings)} />
          </div>
        ) : (
          <>
            {review.propertyRatings && review.propertyRatings.length > 0 && (
              <ReviewRatingGroup title="Property" ratings={review.propertyRatings} />
            )}
            {review.landlordRatings && review.landlordRatings.length > 0 && (
              <ReviewRatingGroup title="Landlord" ratings={review.landlordRatings} />
            )}
          </>
        )}
      </article>
    </Card>
  );

  if (fullReviewHref) {
    return (
      <Link href={fullReviewHref} className="block rounded-3xl">
        {card}
      </Link>
    );
  }

  // Full cards carry an anchor so Discover can link straight to them;
  // HighlightLinkedReview outlines the linked one.
  return (
    <div
      id={reviewAnchorId(review.id)}
      className="scroll-mt-6 rounded-3xl data-[highlighted=true]:ring-2 data-[highlighted=true]:ring-[#08873A]"
    >
      {card}
    </div>
  );
}

function reviewAnchorId(id: Review["id"]) {
  return `review-${id}`;
}

function averageScore(ratings: Review["propertyRatings"]) {
  const scores = (ratings ?? [])
    .map((rating) => rating.score)
    .filter((score): score is number => score !== null);

  return scores.length === 0
    ? null
    : scores.reduce((total, score) => total + score, 0) / scores.length;
}

const detailTones = {
  positive: "bg-[#C5E8C8] text-[#1C5F31]",
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
      <h4 className="text-sm font-semibold uppercase tracking-wide text-[#66706B]">
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
