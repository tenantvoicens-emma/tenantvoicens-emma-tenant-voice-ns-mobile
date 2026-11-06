import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { HeartHandshake } from "lucide-react";

import StartReviewLink from "@/components/navigation/StartReviewLink";
import PropertyPreviewCard from "@/components/profile/PropertyPreviewCard";
import ReviewCard from "@/components/profile/ReviewCard";
import Card from "@/components/ui/Card";
import PageContainer from "@/components/ui/PageContainer";
import RefreshLoadError from "@/components/ui/RefreshLoadError";
import TrustCard from "@/components/ui/TrustCard";
import { sharedOpenGraph, siteDescription } from "@/lib/page-metadata";
import {
  loadApprovedReviewCount,
  loadRecentReviews,
  loadTopProperties,
} from "@/lib/server/discover-data";
import { siteUrl } from "@/lib/site-url";
import DiscoverSearch, { DiscoverSearchFallback } from "./DiscoverClient";

// Its canonical address, so "/?q=..." searches aren't listed as separate
// pages.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: {
    ...sharedOpenGraph,
    title: "Tenant Voice NS",
    description: siteDescription,
    url: "/",
  },
};

// The Discover page. Everything except the search box is built here on
// the server, so search engines see the page's text and a link to every
// building in its lists without running any JavaScript.
export default async function Home() {
  const [recentReviews, topProperties, reviewCount] = await Promise.all([
    settle(loadRecentReviews()),
    settle(loadTopProperties()),
    settle(loadApprovedReviewCount()),
  ]);

  const intro = (
    <div className="space-y-4">
      <p className="text-lg font-medium uppercase tracking-wide text-[#547160]">
        Your next home starts with knowledge
      </p>
      <h1 className="text-4xl font-bold leading-tight tracking-tight text-[#294B3A]">
        Renting is personal. Your research should be, too.
      </h1>
      <p className="text-lg text-[#66706B]">
        Explore renter experiences across Nova Scotia. Our building list
        starts with the Halifax region. Renting somewhere else? Add your
        building when you write a review.
      </p>
    </div>
  );

  const trustCard = <TrustCard />;

  const lists = (
    <div className="space-y-8 lg:grid lg:grid-cols-2 lg:items-start lg:gap-10 lg:space-y-0">
      <section className="space-y-4" aria-labelledby="recent-reviews-heading">
        <div className="space-y-1">
          <h2 id="recent-reviews-heading" className="text-3xl font-bold tracking-tight text-[#294B3A]">
            Recent reviews
          </h2>
          {reviewCount.ok && reviewCount.value > 0 && (
            <ReviewCountInvite count={reviewCount.value} />
          )}
        </div>
        {!recentReviews.ok ? (
          <RefreshLoadError message="Recent reviews couldn't be loaded. Check your connection and try again." />
        ) : recentReviews.value.length > 0 ? (
          <div className="space-y-4">
            {recentReviews.value.map((review) => (
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
        {!topProperties.ok ? (
          <RefreshLoadError message="The most reviewed properties couldn't be loaded. Check your connection and try again." />
        ) : topProperties.value.length > 0 ? (
          <div className="space-y-4">
            {topProperties.value.map((property) => (
              <PropertyPreviewCard key={property.id} property={property} searchTerm="" />
            ))}
          </div>
        ) : (
          <p className="rounded-3xl border border-[#E6E3DA] bg-white p-6 text-lg text-[#4A5A52]">
            Once renters start sharing, the buildings with the most reviews
            will show up here. In the meantime, search above to find yours.
          </p>
        )}
      </section>
    </div>
  );

  return (
    <PageContainer width="wide">
      <SiteNameData />
      <div className="space-y-8">
        {/* The search box needs the address bar (for "/?q=..."), which
            only the browser has, so until it's ready the page shows the
            same thing with a plain search box. */}
        <Suspense
          fallback={
            <DiscoverSearchFallback intro={intro} trustCard={trustCard}>
              {lists}
            </DiscoverSearchFallback>
          }
        >
          <DiscoverSearch intro={intro} trustCard={trustCard}>
            {lists}
          </DiscoverSearch>
        </Suspense>

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

// "27 reviews from Nova Scotia renters so far. Add yours."
function ReviewCountInvite({ count }: { count: number }) {
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

// Tells Google the site's name, so search results show "Tenant Voice NS"
// above its links rather than the bare domain. Only needed on the home
// page.
function SiteNameData() {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Tenant Voice NS",
    alternateName: ["Tenant Voice Nova Scotia", "tenantvoicens.ca"],
    url: `${siteUrl()}/`,
  };
  return (
    <script
      type="application/ld+json"
      // Fixed text built above, with no visitor input in it.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// A failed list shows its own error with "Try again" instead of breaking
// the whole page.
async function settle<T>(
  promise: Promise<T>
): Promise<{ ok: true; value: T } | { ok: false }> {
  try {
    return { ok: true, value: await promise };
  } catch (error) {
    console.error("A Discover list failed to load.", error);
    return { ok: false };
  }
}
