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
import { getPropertyBySlug } from "@/lib/server/property-lookup";
import { supabase } from "@/lib/supabase";
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
  created_at: string;
  property_ratings: SupabaseRatingRow[] | null;
  landlord_ratings: SupabaseRatingRow[] | null;
};

type PropertyPageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    q?: string;
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
  const location = [data.address, data.city].filter(Boolean).join(", ");
  return {
    title: data.name,
    description: `Renter reviews and ratings for ${data.name}${
      location && location !== data.name ? `, ${location}` : ""
    }, from Nova Scotia tenants on Tenant Voice NS.`,
  };
}

export default function PropertyPage({
  params,
  searchParams,
}: PropertyPageProps) {
  return (
    <Suspense fallback={<PropertyLoadingFallback />}>
      <PropertyContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function PropertyContent({
  params,
  searchParams,
}: PropertyPageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const searchTerm = typeof query.q === "string" ? query.q : "";
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

  const { data: reviewData, error: reviewError } = await supabase
    .from("reviews")
    .select(
      "id, review_text, occupancy_duration, would_live_again, created_at, property_ratings(id, category, score), landlord_ratings(id, category, score)"
    )
    .eq("property_id", property.id)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

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
    createdAt: review.created_at,
    propertyRatings: mapRatings([review], "property_ratings", slug),
    landlordRatings: mapRatings([review], "landlord_ratings", slug),
    propertyOverall: overallScore(review.property_ratings),
    landlordOverall: overallScore(review.landlord_ratings),
  }));

  const propertyCategoryAverages = averageByCategory(
    reviewRows,
    "property_ratings"
  );
  const landlordCategoryAverages = averageByCategory(
    reviewRows,
    "landlord_ratings"
  );
  const propertyRatingSummary = summarizeRatings(
    reviewRows,
    "property_ratings"
  );
  const landlordRatingSummary = summarizeRatings(
    reviewRows,
    "landlord_ratings"
  );

  return (
    <PageContainer width="wide">
      {/* On large screens: the building and its summary ratings on the left,
          individual reviews on the right. Phones keep one column. */}
      <div className="space-y-8 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start lg:gap-10 lg:space-y-0">
        <div className="space-y-8">
          <PropertyHeader
            property={property}
            backFallback={{
              url: discoverHref(searchTerm),
              label: searchTerm.trim() ? "search results" : "Discover",
            }}
            reviewCount={reviews.length}
          />
          <PropertySnapshot
            propertyRating={propertyRatingSummary}
            landlordRating={landlordRatingSummary}
          />

          <CategoryRatings
            propertyAverages={propertyCategoryAverages}
            landlordAverages={landlordCategoryAverages}
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
            <p className="text-gray-600">No reviews yet.</p>
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

function discoverHref(searchTerm: string) {
  return searchTerm.trim()
    ? `/?q=${encodeURIComponent(searchTerm.trim())}`
    : "/";
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
  ratingGroup: "property_ratings" | "landlord_ratings",
  propertySlug: string
): Rating[] {
  return reviews.flatMap((review) =>
    detailedRatings(review[ratingGroup]).map((rating) => ({
      id: rating.id,
      propertySlug,
      category: formatCategory(rating.category),
      score: parseRatingScore(rating.score),
    }))
  );
}

function summarizeRatings(
  reviews: SupabaseReviewRow[],
  ratingGroup: "property_ratings" | "landlord_ratings"
) {
  const reviewAverages = reviews.flatMap((review) => {
    const score = overallScore(review[ratingGroup]);
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
function averageByCategory(
  reviews: SupabaseReviewRow[],
  ratingGroup: "property_ratings" | "landlord_ratings"
): CategoryAverage[] {
  const scoresByCategory = new Map<string, number[]>();

  for (const review of reviews) {
    for (const rating of detailedRatings(review[ratingGroup])) {
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
