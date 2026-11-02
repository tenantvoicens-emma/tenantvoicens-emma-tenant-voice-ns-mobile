"use client";

import { useEffect, useTransition } from "react";
import Link from "next/link";
import { RotateCw } from "lucide-react";
import PageContainer from "@/components/ui/PageContainer";

// Shown inside the site's layout when a page crashes unexpectedly.
export default function ErrorPage({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  const [isRetrying, startTransition] = useTransition();

  useEffect(() => {
    console.error("A page failed to render.", error);
  }, [error]);

  return (
    <PageContainer>
      <div className="space-y-6 py-4" role="alert">
        <div className="space-y-4">
          <p className="text-lg font-medium uppercase tracking-wide text-[#547160]">
            Something went wrong
          </p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-[#294B3A]">
            This page didn&apos;t load properly
          </h1>
          <p className="text-lg text-[#66706B]">
            It&apos;s not something you did. Please try again; if it keeps
            happening, head back to Discover.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => startTransition(() => retry())}
            disabled={isRetrying}
            className="flex items-center justify-center gap-2 rounded-full bg-[#08873A] px-6 py-4 text-lg font-medium text-white transition hover:brightness-95 disabled:opacity-60"
          >
            <RotateCw
              className={`h-5 w-5 ${isRetrying ? "animate-spin motion-reduce:animate-none" : ""}`}
              aria-hidden="true"
            />
            {isRetrying ? "Trying again..." : "Try again"}
          </button>
          <Link
            href="/"
            className="flex items-center justify-center rounded-full border border-[#D9D6CE] bg-white px-6 py-4 text-lg font-medium text-[#2F4F46] transition hover:bg-[#EEF5EB]"
          >
            Go to Discover
          </Link>
        </div>
      </div>
    </PageContainer>
  );
}
