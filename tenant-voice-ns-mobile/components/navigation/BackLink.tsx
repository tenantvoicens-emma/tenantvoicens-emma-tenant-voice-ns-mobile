"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type MouseEvent } from "react";
import { readHistory, type HistoryEntry } from "@/lib/page-history";

type BackLinkProps = {
  // Where to go when this tab has no earlier in-app page, e.g. a shared
  // link opened directly. Omit to show nothing in that case.
  fallback?: HistoryEntry;
};

// "Back to <previous page>": returns to the page visited before this one,
// with its search or unfinished review intact.
export default function BackLink({ fallback }: BackLinkProps) {
  const router = useRouter();
  const [previous, setPrevious] = useState<HistoryEntry | null>(null);

  useEffect(() => {
    // Wait a tick so the tracker has recorded this page first.
    const timeoutId = window.setTimeout(() => {
      const entries = readHistory();
      setPrevious(entries.length > 1 ? entries[entries.length - 2] : null);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const target = previous ?? fallback;
  if (!target) {
    return null;
  }

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (
      !previous ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    // Going back (rather than linking forward) restores the page's scroll
    // position and keeps the browser's own Back button in step.
    event.preventDefault();
    router.back();
  }

  return (
    <Link
      href={target.url}
      onClick={handleClick}
      className="mx-auto flex min-h-11 w-fit items-center gap-3 text-lg font-medium text-[#1F2A24] hover:underline"
    >
      <ArrowLeft className="h-5 w-5" aria-hidden="true" />
      Back to {target.label}
    </Link>
  );
}
