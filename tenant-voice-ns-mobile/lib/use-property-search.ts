"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PropertyListing } from "@/types/property";

export type PropertySearch = {
  results: PropertyListing[];
  // "idle" when nothing is typed.
  status: "idle" | "loading" | "done" | "error";
};

const SEARCH_DELAY_MS = 200;

type SearchOutcome = {
  term: string;
  results: PropertyListing[];
  failed: boolean;
};

// Searches properties in the database as someone types, once they pause.
// There are too many properties to load them all into the page.
export function usePropertySearch(term: string, limit = 20): PropertySearch {
  const query = term.trim();
  const [outcome, setOutcome] = useState<SearchOutcome | null>(null);

  useEffect(() => {
    if (!query) {
      return;
    }

    let isCurrent = true;
    const timeoutId = window.setTimeout(async () => {
      const { data, error } = await supabase.rpc("search_properties", {
        p_query: query,
        p_limit: limit,
      });
      if (!isCurrent) {
        return;
      }
      if (error) {
        console.error("Property search failed.", error.code);
      }
      setOutcome({
        term: query,
        failed: Boolean(error),
        results: ((data ?? []) as PropertyListing[]).map((property) => ({
          ...property,
          address: property.address ?? "",
          city: property.city ?? "",
        })),
      });
    }, SEARCH_DELAY_MS);

    return () => {
      isCurrent = false;
      window.clearTimeout(timeoutId);
    };
  }, [query, limit]);

  if (!query) {
    return { results: [], status: "idle" };
  }
  // Until the answer for exactly this text arrives, keep showing the
  // previous results so the list doesn't flicker while typing.
  if (outcome?.term !== query) {
    return { results: outcome?.results ?? [], status: "loading" };
  }
  return {
    results: outcome.results,
    status: outcome.failed ? "error" : "done",
  };
}
