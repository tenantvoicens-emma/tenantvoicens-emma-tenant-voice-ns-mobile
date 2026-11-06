import type { Metadata } from "next";

// The site's own description: the home page and anywhere without one.
export const siteDescription =
  "Honest, moderated reviews of rental buildings and landlords from Nova Scotia renters. Read what it's like to live there, or share your own experience anonymously.";

// The parts of a share preview that are the same on every page. A page
// that sets its own openGraph replaces the site-wide one completely, and
// then also loses the image from app/opengraph-image.tsx, so these are
// repeated rather than inherited.
export const sharedOpenGraph = {
  type: "website",
  siteName: "Tenant Voice NS",
  locale: "en_CA",
  images: [
    {
      url: "/opengraph-image",
      width: 1200,
      height: 630,
      alt: "Tenant Voice NS: renters helping renters in Nova Scotia",
    },
  ],
};

// A page's title and description, used for search results and share
// previews alike, plus its canonical address: the one address search
// engines should list it under (so "/?q=..." or tracking links don't
// count as separate pages). The preview image comes from
// app/opengraph-image.tsx.
export function pageMetadata({
  title,
  shareTitle = title,
  description,
  path,
}: {
  // Shown as "title · Tenant Voice NS" in the browser tab and Google.
  title: string;
  // For share previews, which show the site name separately.
  shareTitle?: string;
  description: string;
  // e.g. "/policies"
  path: string;
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      ...sharedOpenGraph,
      title: shareTitle,
      description,
      url: path,
    },
    // The large image, as on the home page.
    twitter: { card: "summary_large_image" },
  };
}
