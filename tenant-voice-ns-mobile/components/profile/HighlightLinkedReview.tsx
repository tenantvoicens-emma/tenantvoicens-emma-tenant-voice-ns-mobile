"use client";

import { useEffect } from "react";

// When a property page is opened from a Discover review card (URL ends in
// #review-<id>), scroll that review into view and outline it. Browsers
// don't do this on their own after an in-app page change.
export default function HighlightLinkedReview() {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id.startsWith("review-")) {
      return;
    }

    const element = document.getElementById(id);
    if (!element) {
      return;
    }

    // Wait a tick so this runs after the router's own scroll-to-top.
    const timeoutId = window.setTimeout(() => {
      element.scrollIntoView({ block: "start" });
      element.dataset.highlighted = "true";
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  return null;
}
