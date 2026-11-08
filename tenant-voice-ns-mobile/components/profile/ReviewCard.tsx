import Card from "@/components/ui/Card";
import Link from "next/link";
import RatingMeter from "@/components/profile/RatingMeter";
import LabeledRating from "@/components/profile/LabeledRating";
import ClampedReviewText from "@/components/profile/ClampedReviewText";
import ReportReviewButton from "@/components/profile/ReportReviewButton";
import { getPropertyHref } from "@/lib/navigation";
import { reviewIssueLabel } from "@/lib/review-issues";
import { Review } from "@/types/review";
import { MODERATOR_EDIT_NOTICE } from "@/lib/moderator-edit";

type ReviewCardProps = {
  review: Review;
  // Compact cards swap the per-category breakdown for one overall
  // property score.
  compact?: boolean;
};

// Placeholder values the pages use when a reviewer skipped a question.
const UNANSWERED = ["Not specified", "Not answered"];

export default function ReviewCard({
  review,
  compact = false,
}: ReviewCardProps) {
  // published_on is a plain date, read as midnight UTC.
  const reviewDate = review.publishedOn ? new Date(review.publishedOn) : null;
  const formattedDate = reviewDate && !Number.isNaN(reviewDate.getTime())
    ? review.yearOnly
      ? `in ${reviewDate.getUTCFullYear()}`
      : new Intl.DateTimeFormat("en-CA", {
          dateStyle: "medium",
          timeZone: "UTC",
        }).format(reviewDate)
    : null;
  const issues = review.issues ?? [];
  const hasText = review.reviewText.trim().length > 0;

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

        {issues.length > 0 && (
          <div>
            <p className="mb-1.5 text-sm font-semibold uppercase tracking-wide text-[#66706B]">
              Problems this reviewer reported
            </p>
            <ul className="flex flex-wrap gap-2">
              {issues.map((issue) => (
                <li key={issue}>
                  <ReviewDetail label={reviewIssueLabel(issue)} value="" tone="negative" />
                </li>
              ))}
            </ul>
          </div>
        )}

        {hasText &&
          (compact ? (
            <ClampedReviewText text={review.reviewText} />
          ) : (
            <p className="whitespace-pre-line leading-relaxed text-gray-800">
              {review.reviewText}
            </p>
          ))}

        {review.moderatorEdited && (
          <p className="text-sm text-[#66706B]">
            <span className="font-medium text-[#4A5A52]">Edited by a moderator.</span>
            {!compact && <> {MODERATOR_EDIT_NOTICE}</>}
          </p>
        )}

        {compact ? (
          <div className="space-y-1.5 border-t border-[#DEDCD5] pt-3">
            <LabeledRating label="Property" score={review.propertyOverall ?? null} />
          </div>
        ) : (
          <>
            <ReviewRatingGroup
              title="Property"
              headingLevel={review.propertyName ? "h4" : "h3"}
              overall={review.propertyOverall ?? null}
              ratings={review.propertyRatings ?? []}
            />
            {Number.isSafeInteger(Number(review.id)) && (
              <footer className="-mb-2 border-t border-[#EEECE6] pt-1">
                <ReportReviewButton reviewId={Number(review.id)} />
              </footer>
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
      <span>{label}</span>
      {value && <span className="font-semibold">{value}</span>}
    </span>
  );
}

function ReviewRatingGroup({
  title,
  headingLevel: Heading,
  overall,
  ratings,
}: {
  title: string;
  // One level below the card's own heading (the building name, when the
  // card shows it), so screen-reader heading lists stay in order.
  headingLevel: "h3" | "h4";
  overall: number | null;
  ratings: NonNullable<Review["propertyRatings"]>;
}) {
  if (overall === null && ratings.length === 0) {
    return null;
  }

  return (
    <section className="space-y-1 border-t border-[#DEDCD5] pt-3">
      <Heading className="text-sm font-semibold uppercase tracking-wide text-[#66706B]">
        {title} ratings
      </Heading>
      <ul className="divide-y divide-[#EEECE6] text-sm">
        {overall !== null && (
          <li className="flex items-center justify-between gap-3 py-2">
            <span className="min-w-0 font-semibold text-gray-800">Overall</span>
            <span className="shrink-0">
              <RatingMeter score={overall} />
            </span>
          </li>
        )}
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
