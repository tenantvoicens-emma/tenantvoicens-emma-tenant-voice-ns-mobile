import { Suspense } from "react";
import { notFound } from "next/navigation";

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
import {
  detailedRatings,
  formatCategory,
  overallScore,
  parseRatingScore,
} from "@/lib/ratings";
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
  const { data, error } = await supabase
    .from("properties")
    .select("id, slug, name, address, city")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("Failed to load property from Supabase.", error);

    return (
      <PageContainer>
        <div className="space-y-6">
          <p className="text-center text-gray-600" role="alert">
            Property details could not be loaded. Please try again later.
          </p>
        </div>
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
            <p className="text-gray-600" role="alert">
              Reviews could not be loaded. Please try again later.
            </p>
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
