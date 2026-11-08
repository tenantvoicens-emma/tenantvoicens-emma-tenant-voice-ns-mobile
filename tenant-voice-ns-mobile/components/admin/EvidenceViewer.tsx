"use client";

import { useState } from "react";

import { supabase } from "@/lib/supabase";

type EvidencePicture = {
  id: number;
  mime_type: string;
  data: string;
};

type EvidenceViewerProps = {
  reviewId: number;
  // How many pictures the review has (see get_review_evidence_counts).
  count: number;
};

// Pictures a reviewer attached as proof. They are private: only the
// moderator can load them, and only when they ask to see them.
export default function EvidenceViewer({ reviewId, count }: EvidenceViewerProps) {
  const [pictures, setPictures] = useState<EvidencePicture[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (count === 0) {
    return null;
  }

  async function toggle() {
    if (isOpen) {
      setIsOpen(false);
      return;
    }
    setIsOpen(true);
    if (pictures !== null || isLoading) {
      return;
    }
    setIsLoading(true);
    setErrorMessage("");
    const { data, error } = await supabase.rpc("get_review_evidence", {
      p_review_id: reviewId,
    });
    if (error) {
      console.error("Could not load evidence.", error.code);
      setErrorMessage("The pictures couldn't be loaded. Please try again.");
      setIsOpen(false);
    } else {
      setPictures((data ?? []) as EvidencePicture[]);
    }
    setIsLoading(false);
  }

  return (
    <section className="space-y-3 rounded-2xl bg-[#F3F2EE] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#547160]">
          Reviewer&apos;s proof · {count} {count === 1 ? "picture" : "pictures"}
        </p>
        <button
          type="button"
          onClick={() => void toggle()}
          disabled={isLoading}
          aria-expanded={isOpen}
          className="min-h-11 font-medium text-[#2F4F46] underline underline-offset-4 disabled:opacity-60"
        >
          {isLoading ? "Loading..." : isOpen ? "Hide" : "View"}
        </button>
      </div>
      <p className="text-sm text-[#66706B]">
        Private. Never shown publicly, and deleted with the review.
      </p>
      {errorMessage && (
        <p className="text-sm text-[#8A3B2B]" role="alert">
          {errorMessage}
        </p>
      )}
      {isOpen && pictures && (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {pictures.map((picture, index) => (
            <li key={picture.id}>
              {/* The moderator's own copy of a private picture, as a data URL. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:${picture.mime_type};base64,${picture.data}`}
                alt={`Proof picture ${index + 1} attached by the reviewer`}
                className="w-full rounded-2xl border border-[#E6E3DA] bg-white object-contain"
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
