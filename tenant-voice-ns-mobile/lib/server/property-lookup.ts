import { cache } from "react";
import { supabase } from "@/lib/supabase";

// One property by its slug. Wrapped in React's cache() so the page and
// its title (generateMetadata) share a single database request per visit.
export const getPropertyBySlug = cache(async (slug: string) =>
  supabase
    .from("properties")
    .select("id, slug, name, address, city, rental_kind, is_small_rental")
    .eq("slug", slug)
    .maybeSingle()
);

// A property's approved reviews with their ratings, newest first. Shared
// by the page and its title and description, which mention how many
// reviews there are and the average ratings. Reviews are numbered in the
// order they were written, and small rentals' dates show only the year.
export const getApprovedReviews = cache(async (propertyId: number) =>
  supabase
    .from("reviews")
    .select(
      "id, review_text, occupancy_duration, would_live_again, published_on, landlord_on_site, moderator_edited, property_ratings(id, category, score), landlord_ratings(id, category, score)"
    )
    .eq("property_id", propertyId)
    .eq("status", "approved")
    .order("id", { ascending: false })
);
