import type { Metadata } from "next";
import Link from "next/link";
import { Compass, PenLine } from "lucide-react";
import PageContainer from "@/components/ui/PageContainer";

export const metadata: Metadata = {
  title: "Page not found",
};

// Shown for addresses that don't exist, and for property pages whose
// property isn't in the database.
export default function NotFound() {
  return (
    <PageContainer>
      <div className="space-y-6 py-4">
        <div className="space-y-4">
          <p className="text-lg font-medium uppercase tracking-wide text-[#547160]">
            Page not found
          </p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-[#294B3A]">
            We couldn&apos;t find that page
          </h1>
          <p className="text-lg text-[#66706B]">
            The link may be old, or the property may have moved. Search for it
            on Discover, or share your own renting experience.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 rounded-full bg-[#08873A] px-6 py-4 text-lg font-medium text-white transition hover:brightness-95"
          >
            <Compass className="h-5 w-5" aria-hidden="true" />
            Go to Discover
          </Link>
          <Link
            href="/submit-review"
            className="flex items-center justify-center gap-2 rounded-full border border-[#D9D6CE] bg-white px-6 py-4 text-lg font-medium text-[#2F4F46] transition hover:bg-[#EEF5EB]"
          >
            <PenLine className="h-5 w-5" aria-hidden="true" />
            Write a review
          </Link>
        </div>
      </div>
    </PageContainer>
  );
}
