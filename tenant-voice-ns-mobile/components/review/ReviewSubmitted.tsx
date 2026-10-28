"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CircleCheck, Share2 } from "lucide-react";

import Card from "@/components/ui/Card";

type ReviewSubmittedProps = {
  buildingName: string;
  // Null for a building the renter added: it has no page until approved,
  // so sharing points at the home page instead.
  propertySlug: string | null;
};

type ShareStatus = "" | "copied" | "failed";

// Shown in place of the form once a review is sent: what happens next, and
// a link to pass on to neighbours, who are the likeliest next reviewers.
export default function ReviewSubmitted({
  buildingName,
  propertySlug,
}: ReviewSubmittedProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [shareStatus, setShareStatus] = useState<ShareStatus>("");

  // Move focus here so screen readers announce the result and keyboard
  // users don't start from the bottom of a form that's gone.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const path = propertySlug
    ? `/properties/${encodeURIComponent(propertySlug)}`
    : "/";
  const shareUrl = `${window.location.origin}${path}`;
  const shareText = propertySlug
    ? `Renters are sharing what it's like to live at ${buildingName}. Read the reviews or add your own on Tenant Voice NS.`
    : "Renters across Nova Scotia are reviewing their buildings. Read the reviews or add your own on Tenant Voice NS.";

  async function share() {
    setShareStatus("");
    if (navigator.share) {
      try {
        await navigator.share({ title: "Tenant Voice NS", text: shareText, url: shareUrl });
        return;
      } catch (error) {
        // Closing the share sheet isn't a failure.
        if ((error as DOMException).name === "AbortError") {
          return;
        }
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareStatus("copied");
    } catch {
      setShareStatus("failed");
    }
  }

  return (
    <div className="space-y-6">
      <Card tone="green">
        <div className="space-y-3">
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="flex items-center gap-3 text-2xl font-bold tracking-tight text-[#294B3A] outline-none"
          >
            <CircleCheck className="h-7 w-7 shrink-0" aria-hidden="true" />
            Thank you for your review
          </h2>
          <p className="text-lg text-[#4A5A52]">
            We check every review before it goes up, usually within a day.
            {propertySlug
              ? ` Once it’s approved, it will appear on the page for ${buildingName}.`
              : ` Once it’s approved, ${buildingName} will be added to the site with your review.`}
          </p>
        </div>
      </Card>

      <Card>
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-[#294B3A]">
            Share with your neighbours
          </h2>
          <p className="text-[#4A5A52]">
            {propertySlug
              ? "The people in your building know it best. Send them the link so they can add their own review."
              : "The people in your building know it best. Send them the link so they can add their own reviews too."}
          </p>
          <button
            type="button"
            onClick={share}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#08873A] py-4 text-lg font-medium text-white"
          >
            <Share2 className="h-5 w-5" aria-hidden="true" />
            Share with your neighbours
          </button>
          <div className="space-y-1">
            <p className="text-[#66706B]">Or copy this link:</p>
            <p className="break-all rounded-2xl bg-[#F3F3E9] p-3 font-medium text-[#294B3A] select-all">
              {shareUrl}
            </p>
          </div>
          <p role="status" className="text-[#294B3A]">
            {shareStatus === "copied"
              ? "Link copied. You can paste it into a text, email or group chat."
              : shareStatus === "failed"
                ? "We couldn’t copy the link automatically. You can select the link above and copy it."
                : ""}
          </p>
        </div>
      </Card>

      <div className="flex flex-col gap-3 text-lg font-medium sm:flex-row sm:gap-6">
        {propertySlug && (
          <Link href={path} className="text-[#2F4F46] underline underline-offset-4">
            Go to {buildingName}
          </Link>
        )}
        <Link href="/" className="text-[#2F4F46] underline underline-offset-4">
          Back to Discover
        </Link>
      </div>
    </div>
  );
}
