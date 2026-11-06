"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import PropertyPreviewCard from "@/components/profile/PropertyPreviewCard";
import SearchBar from "@/components/ui/SearchBar";
import { usePropertySearch } from "@/lib/use-property-search";

// The searchable part of the Discover page. The page around it, and the
// Recent reviews and Most reviewed lists passed in as `children`, are
// built on the server (app/page.tsx), so they're in the page itself for
// search engines. Only the search box and its results run here.

const SEARCH_INPUT_ID = "discover-search";

const SEARCH_RESULTS_ID = "search-results-heading";

type DiscoverLayoutProps = {
  // The welcome text, shown above the search box.
  intro: ReactNode;
  trustCard: ReactNode;
  // Shown below while nothing is being searched for.
  children: ReactNode;
};

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

export default function DiscoverSearch({
  intro,
  trustCard,
  children,
}: DiscoverLayoutProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlSearchTerm = searchParams.get("q") ?? "";
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
    <DiscoverLayout
      intro={intro}
      trustCard={trustCard}
      searchBox={
        <SearchBar
          id={SEARCH_INPUT_ID}
          label="Find a property"
          value={searchTerm}
          onChange={setSearchTerm}
          suggestions={search.results}
          status={search.status}
          onRetry={search.retry}
        />
      }
    >
      {search.status !== "idle"
        ? // No results and search errors are explained right under the
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
        : children}
    </DiscoverLayout>
  );
}

// What the page shows before the search box is ready (it needs the
// address bar, which only the browser has): the same page, with a search
// box that can be typed in but doesn't search yet. This is also what
// search engines read.
export function DiscoverSearchFallback({
  intro,
  trustCard,
  children,
}: DiscoverLayoutProps) {
  const [searchTerm, setSearchTerm] = useState("");
  return (
    <DiscoverLayout
      intro={intro}
      trustCard={trustCard}
      searchBox={
        <SearchBar
          id={SEARCH_INPUT_ID}
          label="Find a property"
          value={searchTerm}
          onChange={setSearchTerm}
          suggestions={[]}
          status="idle"
          onRetry={() => {}}
        />
      }
    >
      {children}
    </DiscoverLayout>
  );
}

function DiscoverLayout({
  intro,
  trustCard,
  searchBox,
  children,
}: DiscoverLayoutProps & { searchBox: ReactNode }) {
  return (
    <div className="space-y-8">
      {/* Side by side on large screens: the welcome and search on the
          left, the trust card on the right. */}
      <div className="space-y-8 lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-end lg:gap-10 lg:space-y-0">
        <div className="space-y-8">
          {intro}
          <form
            role="search"
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              showSearchResults();
            }}
          >
            {searchBox}
          </form>
        </div>

        {trustCard}
      </div>

      {children}
    </div>
  );
}
