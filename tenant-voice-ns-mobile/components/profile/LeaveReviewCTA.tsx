"use client";

import Link from "next/link";
import { startFreshReview } from "@/lib/review-draft";
import Button from "@/components/ui/Button";

type LeaveReviewCTAProps = {
  propertySlug: string;
};

export default function LeaveReviewCTA({ propertySlug }: LeaveReviewCTAProps) {
  return (
    <div className="space-y-3">
      <h2 className="text-3xl font-bold tracking-tight text-[#294B3A]">
        Lived here?
      </h2>

      <p className="text-lg text-[#66706B]">
        Help future renters by sharing
        your experience.
      </p>

      <Link
        href={`/submit-review?property=${encodeURIComponent(propertySlug)}`}
        onClick={startFreshReview}
      >
        <Button text="Share Your Experience" />
      </Link>

    </div>
  );
}