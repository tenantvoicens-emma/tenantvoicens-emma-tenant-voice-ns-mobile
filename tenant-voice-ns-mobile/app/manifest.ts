import type { MetadataRoute } from "next";

// Lets phones install the site to the home screen, where it opens full
// screen like an app. There's deliberately no service worker or offline
// cache: reviews can be edited or unpublished, so pages should always be
// fresh, and installing works without one.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tenant Voice NS",
    short_name: "Tenant Voice",
    description:
      "Honest, moderated reviews of rental buildings and landlords from Nova Scotia renters.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#FFFFFF",
    lang: "en-CA",
    categories: ["lifestyle", "utilities"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
