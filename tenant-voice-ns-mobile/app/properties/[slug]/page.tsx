import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import CategoryRatings, {
  type CategoryAverage,
} from "@/components/profile/CategoryRatings";
import HighlightLinkedReview from "@/components/profile/HighlightLinkedReview";
import LeaveReviewCTA from "@/components/profile/LeaveReviewCTA";
import PropertyHeader from "@/components/profile/PropertyHeader";
import PropertySnapshot from "@/components/profile/PropertySnapshot";
import ReportedIssues, {
  type IssueCount,
} from "@/components/profile/ReportedIssues";
import ReviewCard from "@/components/profile/ReviewCard";
import ReviewsSection from "@/components/profile/ReviewsSection";
import PageContainer from "@/components/ui/PageContainer";
import RefreshLoadError from "@/components/ui/RefreshLoadError";
import {
  detailedRatings,
  formatCategory,
  overallScore,
  parseRatingScore,
} from "@/lib/ratings";
import { pageMetadata } from "@/lib/page-metadata";
import {
  getApprovedReviews,
  getPropertyBySlug,
} from "@/lib/server/property-lookup";
import { PropertyListing } from "@/types/property";
import { Rating } from "@/types/rating";
import { Review } from "@/types/review";

type SupabaseRatingRow = {
  id: string;
  category: string;
  score: string | number | null;
};

type SupabaseReviewRow = {
  id: string;
  review_text: string | null;
  occupancy_duration: string | null;
  would_live_again: string | null;
  published_on: string;
  moderator_edited: boolean | null;
  issues: string[] | null;
  property_ratings: SupabaseRatingRow[] | null;
};

type PropertyPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({
  params,
}: PropertyPageProps): Promise<Metadata> {
  const { slug } = await params;
  const { data } = await getPropertyBySlug(slug);
  if (!data) {
    // Not found, or the lookup failed: the page itself explains which.
    return { title: "Property" };
  }

  // "Macdonald Apartments, 5885 Cunard Street, Halifax", or just the
  // address and town when the building has no name of its own. People
  // search by address, so it goes in the title.
  const place = [
    data.name,
    data.address && data.address !== data.name ? data.address : null,
    data.city,
  ]
    .filter(Boolean)
    .join(", ");

  const { data: reviewData, error: reviewError } = await getApprovedReviews(data.id);
  const reviewRows = (reviewData ?? []) as SupabaseReviewRow[];
  const count = reviewRows.length;
  const propertyRating = summarizeRatings(reviewRows).average;
  const ratings = [
    propertyRating !== null ? `property ${propertyRating}/5` : null,
  ].filter(Boolean);

  const description = reviewError
    ? `Renter reviews and ratings for ${place}, from Nova Scotia tenants on Tenant Voice NS.`
    : count === 0
      ? `No reviews yet for ${place}. Lived there? Whether it was a good place or a rough one, share your experience anonymously on Tenant Voice NS.`
      : `${count} ${count === 1 ? "renter review" : "renter reviews"} of ${place}${
          ratings.length > 0 ? `. Average ratings: ${ratings.join(", ")}` : ""
        }. Moderated reviews from Nova Scotia tenants.`;

  return {
    ...pageMetadata({
      title: `${place}: tenant reviews`,
      description,
      path: `/properties/${data.slug}`,
    }),
    // A page with no reviews yet has little to offer a search, and many
    // of them would make Google rate the whole site lower. It becomes
    // searchable once its first review is approved (it's added to the
    // sitemap then too). Visitors can still open and review it.
    ...(!reviewError && count === 0 ? { robots: { index: false, follow: true } } : {}),
  };
}

export default function PropertyPage({ params }: PropertyPageProps) {
  return (
    <Suspense fallback={<PropertyLoadingFallback />}>
      <PropertyContent params={params} />
    </Suspense>
  );
}

async function PropertyContent({ params }: PropertyPageProps) {
  const { slug } = await params;
  const { data, error } = await getPropertyBySlug(slug);

  if (error) {
    await waitForRealVisit();
    console.error("Failed to load property from Supabase.", error);

    return (
      <PageContainer>
        <RefreshLoadError message="This property couldn't be loaded. Check your connection and try again." />
      </PageContainer>
    );
  }

  if (!data) {
    notFound();
  }

  const property: PropertyListing = {
    id: data.id,
    slug: data.slug,
    name: data.name,
    address: data.address ?? "",
    city: data.city ?? "",
  };

  const { data: reviewData, error: reviewError } = await getApprovedReviews(property.id);

  if (reviewError) {
    await waitForRealVisit();
    console.error("Failed to load reviews and ratings from Supabase.", reviewError);
  }

  const reviewRows = (reviewData ?? []) as SupabaseReviewRow[];
  const reviews: Review[] = reviewRows.map((review) => ({
    id: review.id,
    propertySlug: slug,
    occupancyPeriod: formatOccupancyDuration(review.occupancy_duration),
    reviewText: review.review_text ?? "",
    wouldLiveAgain: formatWouldLiveAgain(review.would_live_again),
    moderatorEdited: review.moderator_edited === true,
    publishedOn: review.published_on,
    yearOnly: data.is_small_rental === true,
    issues: review.issues ?? [],
    propertyRatings: mapRatings([review], slug),
    propertyOverall: overallScore(review.property_ratings),
  }));

  const propertyCategoryAverages = averageByCategory(reviewRows);
  const propertyRatingSummary = summarizeRatings(reviewRows);
  const issueCounts = countIssues(reviewRows);

  return (
    <PageContainer width="wide">
      {/* On large screens: the building and its summary ratings on the left,
          individual reviews on the right. Phones keep one column. */}
      <div className="space-y-8 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start lg:gap-10 lg:space-y-0">
        <div className="space-y-8">
          <PropertyHeader
            property={property}
            reviewCount={reviews.length}
            rentalKind={data.rental_kind}
          />
          <PropertySnapshot propertyRating={propertyRatingSummary} />

          <ReportedIssues
            issueCounts={issueCounts}
            reviewCount={reviews.length}
          />

          <CategoryRatings
            propertyAverages={propertyCategoryAverages}
            reviewCount={reviews.length}
          />

          <div className="hidden lg:block">
            <LeaveReviewCTA propertySlug={property.slug} />
          </div>
        </div>

        <div className="space-y-8">
          <ReviewsSection reviewCount={reviews.length} />
          {reviewError ? (
            <RefreshLoadError message="Reviews for this property couldn't be loaded. Check your connection and try again." />
          ) : reviews.length === 0 ? (
            <p className="text-gray-600">
              No reviews yet. If you&apos;ve lived here, good or bad, your
              experience helps the next renter.
            </p>
          ) : (
            reviews.map((review) => <ReviewCard key={review.id} review={review} />)
          )}
          <HighlightLinkedReview />

          {/* On phones the prompt comes after the reviews. */}
          <div className="lg:hidden">
            <LeaveReviewCTA propertySlug={property.slug} />
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

// Next renders this page ahead of time (a prerender, or prefetching a
// link) and stops that render partway through, which makes Supabase's
// requests fail. Supabase reports that as an ordinary error, so without
// this the page would log it and could save "couldn't be loaded" as the
// prefetched page. Waiting for a real visit first means a stopped
// prerender simply ends here, while a real visit carries on to show the
// error and "Try again".
async function waitForRealVisit() {
  await connection();
}

function PropertyLoadingFallback() {
  return (
    <PageContainer>
      <div className="space-y-6">
        <p className="text-center text-gray-600" role="status">
          Loading property...
        </p>
      </div>
    </PageContainer>
  );
}

function formatOccupancyDuration(value: string | null) {
  const labels: Record<string, string> = {
    less_than_1_year: "Less than 1 year",
    "1_to_3_years": "1 to 3 years",
    "4_to_6_years": "4 to 6 years",
    "7_to_10_years": "7 to 10 years",
    more_than_10_years: "More than 10 years",
  };

  return value ? labels[value] ?? value.replaceAll("_", " ") : "Not specified";
}

function formatWouldLiveAgain(value: string | null) {
  const normalizedValue = value?.trim().toLowerCase();

  if (normalizedValue === "yes" || normalizedValue === "true") {
    return "Yes";
  }

  if (normalizedValue === "no" || normalizedValue === "false") {
    return "No";
  }

  if (["na", "n/a", "not_applicable"].includes(normalizedValue ?? "")) {
    return "N/A";
  }

  if (normalizedValue === "unsure") {
    return "Unsure";
  }

  return value ? value.replaceAll("_", " ") : "Not answered";
}

function mapRatings(
  reviews: SupabaseReviewRow[],
  propertySlug: string
): Rating[] {
  return reviews.flatMap((review) =>
    detailedRatings(review.property_ratings).map((rating) => ({
      id: rating.id,
      propertySlug,
      category: formatCategory(rating.category),
      score: parseRatingScore(rating.score),
    }))
  );
}

function summarizeRatings(reviews: SupabaseReviewRow[]) {
  const reviewAverages = reviews.flatMap((review) => {
    const score = overallScore(review.property_ratings);
    return score === null ? [] : [score];
  });

  if (reviewAverages.length === 0) {
    return { average: null, reviewCount: 0 };
  }

  const average =
    reviewAverages.reduce((total, score) => total + score, 0) /
    reviewAverages.length;

  return {
    average: Math.round(average * 10) / 10,
    reviewCount: reviewAverages.length,
  };
}

// Averages each category across reviews, skipping N/A and unanswered
// scores; categories nobody scored are left out.
function averageByCategory(reviews: SupabaseReviewRow[]): CategoryAverage[] {
  const scoresByCategory = new Map<string, number[]>();

  for (const review of reviews) {
    for (const rating of detailedRatings(review.property_ratings)) {
      const score = parseRatingScore(rating.score);
      if (score === null) {
        continue;
      }
      const category = formatCategory(rating.category);
      scoresByCategory.set(category, [
        ...(scoresByCategory.get(category) ?? []),
        score,
      ]);
    }
  }

  return [...scoresByCategory]
    .map(([category, scores]) => ({
      category,
      average:
        Math.round(
          (scores.reduce((total, score) => total + score, 0) / scores.length) * 10
        ) / 10,
      ratingCount: scores.length,
    }))
    .sort((a, b) => a.category.localeCompare(b.category));
}

// How many reviews ticked each problem, most-reported first.
function countIssues(reviews: SupabaseReviewRow[]): IssueCount[] {
  const counts = new Map<string, number>();
  for (const review of reviews) {
    for (const issue of new Set(review.issues ?? [])) {
      counts.set(issue, (counts.get(issue) ?? 0) + 1);
    }
  }
  return [...counts]
    .map(([issue, count]) => ({ issue, count }))
    .sort((a, b) => b.count - a.count || a.issue.localeCompare(b.issue));
}
