import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private or personal pages, and the form API.
      disallow: ["/admin", "/account", "/api/"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
