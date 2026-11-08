import type { MetadataRoute } from "next";
import { cacheLife } from "next/cache";
import { supabase } from "@/lib/supabase";
import { siteUrl } from "@/lib/site-url";

type ReviewedPropertyRow = {
  published_on: string;
  properties: { slug: string } | { slug: string }[] | null;
};

const PAGE_SIZE = 1000;

// The main pages, plus every building with at least one approved review.
// Buildings with no reviews yet are left out; their pages also ask search
// engines not to list them until they have one. Rebuilt at most hourly,
// so a newly approved review's building appears within the hour.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  "use cache";
  cacheLife("hours");

  const base = siteUrl();
  const buildings = await reviewedBuildings();
  const newest = [...buildings.values()].sort().at(-1);

  return [
    {
      url: `${base}/`,
      ...(newest ? { lastModified: newest } : {}),
      changeFrequency: "daily",
      priority: 1,
    },
    { url: `${base}/submit-review`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/policies`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/terms`, changeFrequency: "monthly", priority: 0.3 },
    ...[...buildings].map(([slug, lastModified]) => ({
      url: `${base}/properties/${slug}`,
      // The date of its newest review, so search engines know to look
      // again. (Small rentals' reviews are dated January 1 of their year.)
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}

// slug -> date of its newest approved review (YYYY-MM-DD). Visitors can
// only read approved reviews and listed buildings, so that's all this
// sees. If the database can't be reached, the main pages are still listed.
async function reviewedBuildings() {
  const newestBySlug = new Map<string, string>();

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("reviews")
      .select("published_on, properties!inner(slug)")
      .eq("status", "approved")
      .order("id")
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error("Could not load reviewed buildings for the sitemap.", error.code);
      break;
    }

    for (const row of (data ?? []) as ReviewedPropertyRow[]) {
      const property = Array.isArray(row.properties) ? row.properties[0] : row.properties;
      if (!property?.slug || !row.published_on) {
        continue;
      }
      const current = newestBySlug.get(property.slug);
      if (!current || row.published_on > current) {
        newestBySlug.set(property.slug, row.published_on);
      }
    }

    if (!data || data.length < PAGE_SIZE) {
      break;
    }
  }

  return new Map([...newestBySlug].sort(([a], [b]) => a.localeCompare(b)));
}
