"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  markHistoryNavigation,
  recordPage,
  registerPageLabel,
} from "@/lib/page-history";

// Records each page change for BackLink. Rendered once, in the layout.
export default function HistoryTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();

  useEffect(() => {
    window.addEventListener("popstate", markHistoryNavigation);
    return () => window.removeEventListener("popstate", markHistoryNavigation);
  }, []);

  useEffect(() => {
    recordPage(query ? `${pathname}?${query}` : pathname);
  }, [pathname, query]);

  return null;
}

// Lets a page name itself in "Back to ..." links, e.g. a property's name.
export function PageLabel({ label }: { label: string }) {
  const pathname = usePathname();

  useEffect(() => {
    registerPageLabel(pathname, label);
  }, [pathname, label]);

  return null;
}
