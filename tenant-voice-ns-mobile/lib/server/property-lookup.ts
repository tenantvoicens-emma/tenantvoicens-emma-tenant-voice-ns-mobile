import { cache } from "react";
import { supabase } from "@/lib/supabase";

// One property by its slug. Wrapped in React's cache() so the page and
// its title (generateMetadata) share a single database request per visit.
export const getPropertyBySlug = cache(async (slug: string) =>
  supabase
    .from("properties")
    .select("id, slug, name, address, city")
    .eq("slug", slug)
    .maybeSingle()
);
