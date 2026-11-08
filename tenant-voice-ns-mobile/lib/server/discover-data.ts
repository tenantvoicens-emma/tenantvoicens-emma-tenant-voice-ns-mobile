import { cacheLife } from "next/cache";

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

// The Discover page's lists, loaded on the server so they're part of the
// page itself: search engines see every building they link to without
// running the page's JavaScript. Each is cached for about a minute, so a
// newly approved review shows up quickly without every visit asking the
// database. A failed load throws, and isn't cached.

type DiscoverReviewRow = {
  id: number;
  review_text: string | null;
  occupancy_duration: string | null;
  would_live_again: string | null;
  published_on: string;
  moderator_edited: boolean | null;
  properties:
    | { name: string; slug: string }
    | { name: string; slug: string }[]
    | null;
  property_ratings: {
    id: number;
    category: string;
    score: string | number | null;
  }[] | null;
  issues: string[] | null;
};

export async function loadRecentReviews(): Promise<Review[]> {
  "use cache";
  cacheLife("minutes");

  const { data, error } = await supabase
    .from("reviews")
    .select(
      "id, review_text, occupancy_duration, would_live_again, published_on, moderator_edited, properties!inner(name, slug), issues, property_ratings(id, category, score)"
    )
    .eq("status", "approved")
    // Small rentals are left out: being near the top of this list would
    // show roughly when a review was written, which their pages don't.
    .eq("properties.is_small_rental", false)
    .order("id", { ascending: false })
    .limit(5);
  if (error) {
    throw new Error(`Recent reviews failed to load (${error.code}).`);
  }
  return ((data ?? []) as unknown as DiscoverReviewRow[]).map(mapDiscoverReview);
}

export async function loadTopProperties(): Promise<PropertyListing[]> {
  "use cache";
  cacheLife("minutes");

  const { data, error } = await supabase
    .from("discover_top_properties")
    .select("id, slug, name, address, city, review_count, property_rating")
    .order("review_count", { ascending: false })
    .order("name")
    .limit(5);
  if (error) {
    throw new Error(`Most reviewed properties failed to load (${error.code}).`);
  }
  return (data ?? []).map((property) => ({
    ...property,
    address: property.address ?? "",
    city: property.city ?? "",
    reviewCount: Number(property.review_count),
    propertyRating: parseRatingScore(property.property_rating),
  }));
}

// How many reviews are published, for "27 reviews from Nova Scotia
// renters so far".
export async function loadApprovedReviewCount(): Promise<number> {
  "use cache";
  cacheLife("minutes");

  const { count, error } = await supabase
    .from("reviews")
    .select("id", { count: "exact", head: true })
    .eq("status", "approved");
  if (error) {
    throw new Error(`Could not count reviews (${error.code}).`);
  }
  return count ?? 0;
}

function mapDiscoverReview(row: DiscoverReviewRow): Review {
  const property = Array.isArray(row.properties)
    ? row.properties[0] ?? null
    : row.properties;
  const propertySlug = property?.slug ?? "";

  return {
    id: row.id,
    propertySlug,
    propertyName: property?.name,
    occupancyPeriod: formatOccupancy(row.occupancy_duration),
    reviewText: row.review_text ?? "",
    wouldLiveAgain: formatWouldLiveAgain(row.would_live_again),
    moderatorEdited: row.moderator_edited === true,
    publishedOn: row.published_on,
    propertyRatings: mapDiscoverRatings(row.property_ratings, propertySlug),
    issues: row.issues ?? [],
    propertyOverall: overallScore(row.property_ratings),
  };
}

function mapDiscoverRatings(
  ratings: DiscoverReviewRow["property_ratings"],
  propertySlug: string
): Rating[] {
  return detailedRatings(ratings).map((rating) => ({
    id: String(rating.id),
    propertySlug,
    category: formatCategory(rating.category),
    score: parseRatingScore(rating.score),
  }));
}

function formatOccupancy(value: string | null) {
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
  const labels: Record<string, string> = {
    yes: "Yes",
    no: "No",
    unsure: "Unsure",
    na: "N/A",
  };
  return value ? labels[value.toLowerCase()] ?? value : "Not answered";
}
