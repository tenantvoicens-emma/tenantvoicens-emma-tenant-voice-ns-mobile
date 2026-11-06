import type { Metadata } from "next";

import { sharedOpenGraph, siteDescription } from "@/lib/page-metadata";
import DiscoverClient from "./DiscoverClient";

// The Discover page runs in the browser (search, recent reviews); this
// file only adds what has to come from the server: its canonical address,
// so "/?q=..." searches aren't listed as separate pages.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: {
    ...sharedOpenGraph,
    title: "Tenant Voice NS",
    description: siteDescription,
    url: "/",
  },
};

export default function Home() {
  return <DiscoverClient />;
}
