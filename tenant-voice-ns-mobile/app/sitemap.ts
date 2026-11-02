import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

// The main pages. Property pages are found through links from Discover.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/submit-review`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/policies`, changeFrequency: "monthly", priority: 0.5 },
  ];
}
