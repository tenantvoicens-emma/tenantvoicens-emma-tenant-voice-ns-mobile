"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { HeartHandshake } from "lucide-react";

import BackLink from "@/components/navigation/BackLink";
import PropertyPreviewCard from "@/components/profile/PropertyPreviewCard";
import ReviewCard from "@/components/profile/ReviewCard";
import Card from "@/components/ui/Card";
import PageContainer from "@/components/ui/PageContainer";
import SearchBar from "@/components/ui/SearchBar";
import TrustCard from "@/components/ui/TrustCard";
import { supabase } from "@/lib/supabase";
import { PropertyListing } from "@/types/property";
import { Rating } from "@/types/rating";
import { Review } from "@/types/review";

type DiscoverReviewRow = {
  id: number;
  review_text: string | null;
  occupancy_duration: string | null;
  would_live_again: string | null;
  created_at: string;
  properties:
    | { name: string; slug: string }
    | { name: string; slug: string }[]
    | null;
  property_ratings: {
    id: number;
    category: string;
    score: string | number | null;
  }[] | null;
  landlord_ratings: {
    id: number;
    category: string;
    score: string | number | null;
  }[] | null;
};

const SEARCH_INPUT_ID = "property-search";

const SEARCH_RESULTS_ID = "search-results-heading";

// Pressing Enter (the keyboard's Search key on phones) scrolls to the
// results; with nothing typed, it leaves the cursor in the search box.
function showSearchResults() {
  const results = document.getElementById(SEARCH_RESULTS_ID);
  if (results) {
    results.scrollIntoView({ block: "start", behavior: "smooth" });
    return;
  }
  const input = document.getElementById(SEARCH_INPUT_ID);
  input?.scrollIntoView({ block: "center" });
  input?.focus({ preventScroll: true });
}

export default function Home() {
  return (
    <Suspense fallback={<DiscoverLoadingFallback />}>
      <DiscoverPage />
    </Suspense>
  );
}

function DiscoverPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlSearchTerm = searchParams.get("q") ?? "";
  const [properties, setProperties] = useState<PropertyListing[]>([]);
  const [recentReviews, setRecentReviews] = useState<Review[]>([]);
  const [topProperties, setTopProperties] = useState<PropertyListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [recentReviewsError, setRecentReviewsError] = useState(false);
  const [topPropertiesError, setTopPropertiesError] = useState(false);
  const [searchTerm, setSearchTerm] = useState(urlSearchTerm);

  useEffect(() => {
    let isActive = true;

    async function loadProperties() {
      try {
        const [propertiesResult, reviewsResult, topPropertiesResult] =
          await Promise.all([
            supabase
              .from("properties")
              .select("id, slug, name, address, city")
              .order("name"),
            supabase
              .from("reviews")
              .select(
                "id, review_text, occupancy_duration, would_live_again, created_at, properties(name, slug), property_ratings(id, category, score), landlord_ratings(id, category, score)"
              )
              .eq("status", "approved")
              .order("created_at", { ascending: false })
              .limit(5),
            supabase
              .from("discover_top_properties")
              .select("id, slug, name, address, city, review_count, property_rating, landlord_rating")
              .order("review_count", { ascending: false })
              .order("name")
              .limit(5),
          ]);

        if (propertiesResult.error) {
          throw propertiesResult.error;
        }

        if (!isActive) {
          return;
        }

        setProperties(
          (propertiesResult.data ?? []).map((property) => ({
            ...property,
            address: property.address ?? "",
            city: property.city ?? "",
          }))
        );

        if (reviewsResult.error) {
          console.error("Failed to load recent approved reviews.", reviewsResult.error.code);
          setRecentReviewsError(true);
        } else {
          setRecentReviews(
            ((reviewsResult.data ?? []) as unknown as DiscoverReviewRow[]).map(
              mapDiscoverReview
            )
          );
        }

        if (topPropertiesResult.error) {
          console.error("Failed to load most-reviewed properties.", topPropertiesResult.error.code);
          setTopPropertiesError(true);
        } else {
          setTopProperties(
            (topPropertiesResult.data ?? []).map((property) => ({
              ...property,
              address: property.address ?? "",
              city: property.city ?? "",
              reviewCount: Number(property.review_count),
              propertyRating: parseRatingScore(property.property_rating),
              landlordRating: parseRatingScore(property.landlord_rating),
            }))
          );
        }
      } catch (error) {
        console.error("Failed to load properties from Supabase.", error);
        if (isActive) {
          setLoadError(true);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadProperties();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === urlSearchTerm.trim()) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const query = searchTerm.trim()
        ? `/?q=${encodeURIComponent(searchTerm.trim())}`
        : "/";
      router.replace(query, { scroll: false });
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [router, searchTerm, urlSearchTerm]);

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const filteredProperties = properties.filter((property) =>
    [property.name, property.address, property.city].some((value) =>
      value.toLowerCase().includes(normalizedSearchTerm)
    )
  );

  return (
    <PageContainer>
      <div className="space-y-8">
        <BackLink />

        <div className="space-y-4">
          <p className="text-lg font-medium uppercase tracking-wide text-[#5B7A68]">
            Your next home starts with knowledge
          </p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-[#294B3A]">
            Renting is personal. Your research should be, too.
          </h1>
          <p className="text-lg text-[#66706B]">
            Explore renter experiences with properties across Nova Scotia.
          </p>
        </div>

        <form
          role="search"
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            showSearchResults();
          }}
        >
          <SearchBar
            id={SEARCH_INPUT_ID}
            label="Find a property"
            value={searchTerm}
            onChange={setSearchTerm}
            suggestions={filteredProperties}
          />
        </form>

        <TrustCard />

        {normalizedSearchTerm ? (
          <section className="space-y-4" aria-labelledby={SEARCH_RESULTS_ID}>
            <h2 id={SEARCH_RESULTS_ID} className="scroll-mt-6 text-3xl font-bold tracking-tight text-[#294B3A]">
              Search results
            </h2>
            {isLoading && <p role="status">Loading properties...</p>}
            {loadError && (
              <p className="text-center text-gray-500" role="alert">
                Properties could not be loaded. Check the Supabase connection and table access.
              </p>
            )}
            {!isLoading && !loadError && filteredProperties.length === 0 && (
              <p className="text-gray-500">No properties found.</p>
            )}
            {filteredProperties.map((property) => (
              <PropertyPreviewCard
                key={property.id}
                property={property}
                searchTerm={searchTerm}
              />
            ))}
          </section>
        ) : (
          <div className="space-y-8">
            <section className="space-y-4" aria-labelledby="recent-reviews-heading">
              <h2 id="recent-reviews-heading" className="text-3xl font-bold tracking-tight text-[#294B3A]">
                Recent reviews
              </h2>
              {isLoading && recentReviews.length === 0 && (
                <p className="text-gray-500" role="status">Loading recent reviews...</p>
              )}
              {recentReviewsError ? (
                <p className="text-gray-600" role="alert">
                  Recent reviews are temporarily unavailable.
                </p>
              ) : recentReviews.length > 0 ? (
                <div className="space-y-4">
                  {recentReviews.map((review) => (
                    <ReviewCard key={review.id} review={review} compact />
                  ))}
                </div>
              ) : !isLoading ? (
                <p className="text-gray-500">No approved reviews yet.</p>
              ) : null}
            </section>

            <section className="space-y-4" aria-labelledby="top-properties-heading">
              <h2 id="top-properties-heading" className="text-3xl font-bold tracking-tight text-[#294B3A]">
                Most reviewed properties
              </h2>
              {isLoading && topProperties.length === 0 && (
                <p className="text-gray-500" role="status">Loading property rankings...</p>
              )}
              {topPropertiesError ? (
                <p className="text-gray-600" role="alert">
                  Property rankings are unavailable. The Discover ranking migration may need to be applied in Supabase.
                </p>
              ) : topProperties.length > 0 ? (
                <div className="space-y-4">
                  {topProperties.map((property) => (
                    <PropertyPreviewCard
                      key={property.id}
                      property={property}
                      searchTerm=""
                    />
                  ))}
                </div>
              ) : !isLoading ? (
                <p className="text-gray-500">No properties have approved reviews yet.</p>
              ) : null}
            </section>
          </div>
        )}

        <Link href="/policies#review-guidelines" className="group block rounded-3xl">
          <Card>
            <div className="space-y-2">
              <h2 className="flex items-center gap-3 text-xl font-bold text-[#294B3A]">
                <HeartHandshake className="h-6 w-6 shrink-0" aria-hidden="true" />
                A better renting community
              </h2>
              <p className="text-lg text-[#66706B]">
                Learn how reviews can be useful, fair, and safer for everyone.
              </p>
            </div>
          </Card>
        </Link>
      </div>
    </PageContainer>
  );
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
    createdAt: row.created_at,
    propertyRatings: mapDiscoverRatings(row.property_ratings, propertySlug),
    landlordRatings: mapDiscoverRatings(row.landlord_ratings, propertySlug),
  };
}

function mapDiscoverRatings(
  ratings: DiscoverReviewRow["property_ratings"],
  propertySlug: string
): Rating[] {
  return (ratings ?? []).map((rating) => ({
    id: String(rating.id),
    propertySlug,
    category: rating.category
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase()),
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

function parseRatingScore(value: string | number | null) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (!value || ["na", "n/a"].includes(value.trim().toLowerCase())) {
    return null;
  }
  const score = Number(value);
  return Number.isFinite(score) ? score : null;
}

function DiscoverLoadingFallback() {
  return (
    <PageContainer>
      <div className="space-y-8">
        <h1 className="text-4xl font-bold leading-tight tracking-tight text-[#294B3A]">
          Renting is personal. Your research should be, too.
        </h1>
        <p className="text-center text-gray-500" role="status">
          Loading properties...
        </p>
      </div>
    </PageContainer>
  );
}