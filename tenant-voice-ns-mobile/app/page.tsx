"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { HeartHandshake } from "lucide-react";

import StartReviewLink from "@/components/navigation/StartReviewLink";
import PropertyPreviewCard from "@/components/profile/PropertyPreviewCard";
import ReviewCard from "@/components/profile/ReviewCard";
import Card from "@/components/ui/Card";
import LoadError from "@/components/ui/LoadError";
import PageContainer from "@/components/ui/PageContainer";
import SearchBar from "@/components/ui/SearchBar";
import TrustCard from "@/components/ui/TrustCard";
import {
  detailedRatings,
  formatCategory,
  overallScore,
  parseRatingScore,
} from "@/lib/ratings";
import { supabase } from "@/lib/supabase";
import { usePropertySearch } from "@/lib/use-property-search";
import { PropertyListing } from "@/types/property";
import { Rating } from "@/types/rating";
import { Review } from "@/types/review";

type DiscoverReviewRow = {
  id: number;
  review_text: string | null;
  occupancy_duration: string | null;
  would_live_again: string | null;
  created_at: string;
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
  landlord_ratings: {
    id: number;
    category: string;
    score: string | number | null;
  }[] | null;
};

const SEARCH_INPUT_ID = "discover-search";

const SEARCH_RESULTS_ID = "search-results-heading";

// Pressing Enter (the keyboard's Search key on phones) scrolls to the
// results; with nothing typed, it leaves the cursor in the search box.
function showSearchResults() {
  const results = document.getElementById(SEARCH_RESULTS_ID);
  if (results) {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    results.scrollIntoView({ block: "start", behavior: reduceMotion ? "auto" : "smooth" });
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
  const recentReviews = useDiscoverSection(loadRecentReviews);
  const topProperties = useDiscoverSection(loadTopProperties);
  const [searchTerm, setSearchTerm] = useState(urlSearchTerm);

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

  const search = usePropertySearch(searchTerm);

  return (
    <PageContainer width="wide">
      <div className="space-y-8">
        {/* Side by side on large screens: the welcome and search on the
            left, the trust card on the right. */}
        <div className="space-y-8 lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-end lg:gap-10 lg:space-y-0">
          <div className="space-y-8">
            <div className="space-y-4">
              <p className="text-lg font-medium uppercase tracking-wide text-[#547160]">
                Your next home starts with knowledge
              </p>
              <h1 className="text-4xl font-bold leading-tight tracking-tight text-[#294B3A]">
                Renting is personal. Your research should be, too.
              </h1>
              <p className="text-lg text-[#66706B]">
                Explore renter experiences across Nova Scotia. Our building list
                starts with the Halifax region; renting somewhere else? Add your
                building when you write a review.
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
                suggestions={search.results}
                status={search.status}
                onRetry={search.retry}
              />
            </form>
          </div>

          <TrustCard />
        </div>

        {search.status !== "idle" ? (
          // No results and search errors are explained right under the
          // search box, so this only lists what was found.
          (search.status === "loading" || search.results.length > 0) && (
            <section className="space-y-4" aria-labelledby={SEARCH_RESULTS_ID}>
              <h2 id={SEARCH_RESULTS_ID} className="scroll-mt-6 text-3xl font-bold tracking-tight text-[#294B3A]">
                Search results
              </h2>
              {search.status === "loading" && search.results.length === 0 && (
                <p className="text-[#66706B]">Searching...</p>
              )}
              <div className="space-y-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4 lg:space-y-0">
                {search.results.map((property) => (
                  <PropertyPreviewCard
                    key={property.id}
                    property={property}
                    searchTerm={searchTerm}
                  />
                ))}
              </div>
            </section>
          )
        ) : (
          <div className="space-y-8 lg:grid lg:grid-cols-2 lg:items-start lg:gap-10 lg:space-y-0">
            <section className="space-y-4" aria-labelledby="recent-reviews-heading">
              <div className="space-y-1">
                <h2 id="recent-reviews-heading" className="text-3xl font-bold tracking-tight text-[#294B3A]">
                  Recent reviews
                </h2>
                <ReviewCountInvite />
              </div>
              {recentReviews.status === "loading" ? (
                <p className="text-gray-500" role="status">Loading recent reviews...</p>
              ) : recentReviews.status === "error" ? (
                <LoadError
                  message="Recent reviews couldn't be loaded. Check your connection and try again."
                  onRetry={recentReviews.retry}
                />
              ) : recentReviews.items.length > 0 ? (
                <div className="space-y-4">
                  {recentReviews.items.map((review) => (
                    <ReviewCard key={review.id} review={review} compact />
                  ))}
                </div>
              ) : (
                <div className="space-y-4 rounded-3xl border border-[#E6E3DA] bg-white p-6">
                  <p className="text-lg text-[#4A5A52]">
                    No reviews yet. Tenant Voice NS is just getting started, so
                    yours could be one of the first.
                  </p>
                  <StartReviewLink className="inline-flex items-center justify-center rounded-full bg-[#08873A] px-6 py-3 text-lg font-medium text-white transition hover:brightness-95">
                    Share your experience
                  </StartReviewLink>
                </div>
              )}
            </section>

            <section className="space-y-4" aria-labelledby="top-properties-heading">
              <h2 id="top-properties-heading" className="text-3xl font-bold tracking-tight text-[#294B3A]">
                Most reviewed properties
              </h2>
              {topProperties.status === "loading" ? (
                <p className="text-gray-500" role="status">Loading property rankings...</p>
              ) : topProperties.status === "error" ? (
                <LoadError
                  message="The most reviewed properties couldn't be loaded. Check your connection and try again."
                  onRetry={topProperties.retry}
                />
              ) : topProperties.items.length > 0 ? (
                <div className="space-y-4">
                  {topProperties.items.map((property) => (
                    <PropertyPreviewCard
                      key={property.id}
                      property={property}
                      searchTerm=""
                    />
                  ))}
                </div>
              ) : (
                <p className="rounded-3xl border border-[#E6E3DA] bg-white p-6 text-lg text-[#4A5A52]">
                  Once renters start sharing, the buildings with the most
                  reviews will show up here. In the meantime, search above to
                  find yours.
                </p>
              )}
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

type SectionState<T> = {
  status: "loading" | "done" | "error";
  items: T[];
  retry: () => void;
};

// Loads one Discover section. A failure (including a request that times
// out) shows an error with "Try again" instead of loading forever.
function useDiscoverSection<T>(load: () => Promise<T[]>): SectionState<T> {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{
    attempt: number;
    items: T[];
    failed: boolean;
  } | null>(null);

  useEffect(() => {
    let isActive = true;
    load().then(
      (items) => {
        if (isActive) {
          setResult({ attempt, items, failed: false });
        }
      },
      (error: unknown) => {
        console.error("Failed to load a Discover section.", error);
        if (isActive) {
          setResult({ attempt, items: [], failed: true });
        }
      }
    );
    return () => {
      isActive = false;
    };
  }, [load, attempt]);

  const retry = useCallback(() => setAttempt((count) => count + 1), []);

  if (result?.attempt !== attempt) {
    return { status: "loading", items: [], retry };
  }
  return {
    status: result.failed ? "error" : "done",
    items: result.items,
    retry,
  };
}

// "27 reviews from Nova Scotia renters so far. Add yours." Counts approved
// reviews live, so it never needs updating. Shows nothing until it loads,
// if it fails, or before the first review (the empty state covers that).
function ReviewCountInvite() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let isActive = true;
    void supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved")
      .then(({ count: approvedCount, error }) => {
        if (error) {
          console.error("Could not count reviews.", error.code);
          return;
        }
        if (isActive) {
          setCount(approvedCount ?? null);
        }
      });
    return () => {
      isActive = false;
    };
  }, []);

  if (!count) {
    return null;
  }

  return (
    <p className="text-[#4A5A52]">
      {count.toLocaleString("en-CA")} {count === 1 ? "review" : "reviews"} from
      Nova Scotia renters so far.{" "}
      <StartReviewLink className="font-medium text-[#2F4F46] underline decoration-[#2F4F46]/30 underline-offset-4">
        Add yours
      </StartReviewLink>
      .
    </p>
  );
}

async function loadRecentReviews(): Promise<Review[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select(
      "id, review_text, occupancy_duration, would_live_again, created_at, moderator_edited, properties(name, slug), property_ratings(id, category, score), landlord_ratings(id, category, score)"
    )
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) {
    throw new Error(`Recent reviews failed to load (${error.code}).`);
  }
  return ((data ?? []) as unknown as DiscoverReviewRow[]).map(mapDiscoverReview);
}

async function loadTopProperties(): Promise<PropertyListing[]> {
  const { data, error } = await supabase
    .from("discover_top_properties")
    .select("id, slug, name, address, city, review_count, property_rating, landlord_rating")
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
    landlordRating: parseRatingScore(property.landlord_rating),
  }));
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
    createdAt: row.created_at,
    propertyRatings: mapDiscoverRatings(row.property_ratings, propertySlug),
    landlordRatings: mapDiscoverRatings(row.landlord_ratings, propertySlug),
    propertyOverall: overallScore(row.property_ratings),
    landlordOverall: overallScore(row.landlord_ratings),
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