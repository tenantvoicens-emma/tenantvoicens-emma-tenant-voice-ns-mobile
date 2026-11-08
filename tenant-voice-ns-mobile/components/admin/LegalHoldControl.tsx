"use client";

import { useState } from "react";

import { supabase } from "@/lib/supabase";

export type LegalHold = {
  placed_at: string;
  note: string | null;
};

type LegalHoldControlProps = {
  reviewId: number;
  hold: LegalHold | undefined;
  // Called after a hold is placed (with its details) or released (null).
  onChange: (reviewId: number, hold: LegalHold | null) => void;
};

// A legal hold stops the nightly cleanups from deleting a review, its
// history, its reports or its proof pictures. Place one as soon as a legal
// notice, court order or threat arrives about a review, and release it only
// when a lawyer says the matter is closed. Deleting records once a claim is
// threatened can count against the site.
export default function LegalHoldControl({
  reviewId,
  hold,
  onChange,
}: LegalHoldControlProps) {
  const [isAsking, setIsAsking] = useState(false);
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function save(place: boolean) {
    if (isSaving) {
      return;
    }
    setIsSaving(true);
    setErrorMessage("");
    const trimmed = note.trim();
    const { error } = await supabase.rpc("set_review_legal_hold", {
      p_review_id: reviewId,
      p_hold: place,
      p_note: place && trimmed ? trimmed : null,
    });
    if (error) {
      console.error("Could not change the legal hold.", error.code);
      setErrorMessage("The legal hold couldn't be saved. Please try again.");
    } else {
      onChange(
        reviewId,
        place
          ? { placed_at: new Date().toISOString(), note: trimmed || null }
          : null
      );
      setIsAsking(false);
      setNote("");
    }
    setIsSaving(false);
  }

  if (hold) {
    return (
      <section
        className="space-y-2 rounded-2xl border border-[#E8D9B5] bg-[#FBF5E6] p-4 text-[#4A4030]"
        role="status"
      >
        <p className="font-semibold">
          Legal hold since {new Date(hold.placed_at).toLocaleDateString()}
        </p>
        <p className="text-sm">
          This review, its history, reports and proof pictures won&apos;t be
          deleted automatically.
          {hold.note && <> Note: “{hold.note}”</>}
        </p>
        <button
          type="button"
          onClick={() => void save(false)}
          disabled={isSaving}
          className="min-h-11 font-medium underline underline-offset-4 disabled:opacity-60"
        >
          {isSaving ? "Saving..." : "Release hold"}
        </button>
        {errorMessage && (
          <p className="text-sm text-[#8A3B2B]" role="alert">
            {errorMessage}
          </p>
        )}
      </section>
    );
  }

  if (!isAsking) {
    return (
      <button
        type="button"
        onClick={() => setIsAsking(true)}
        className="min-h-11 text-sm font-medium text-[#66706B] underline underline-offset-4"
      >
        Place legal hold
      </button>
    );
  }

  return (
    <section className="space-y-2 rounded-2xl bg-[#F3F2EE] p-4">
      <label htmlFor={`hold-note-${reviewId}`} className="block font-medium text-[#294B3A]">
        Place a legal hold{" "}
        <span className="font-normal text-[#66706B]">(note is optional)</span>
      </label>
      <p className="text-sm text-[#66706B]">
        Keeps this review and its records from being deleted automatically.
        Use it as soon as a legal notice, court order or threat arrives.
      </p>
      <input
        id={`hold-note-${reviewId}`}
        type="text"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        maxLength={500}
        placeholder="e.g. Letter from a lawyer received Nov 12"
        className="w-full rounded-2xl border border-[#D9D6CE] bg-white p-3 focus:border-[#08873A]"
      />
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void save(true)}
          disabled={isSaving}
          className="min-h-11 rounded-full bg-[#08873A] px-5 font-medium text-white disabled:opacity-60"
        >
          {isSaving ? "Saving..." : "Place hold"}
        </button>
        <button
          type="button"
          onClick={() => {
            setIsAsking(false);
            setNote("");
            setErrorMessage("");
          }}
          disabled={isSaving}
          className="min-h-11 px-3 font-medium text-[#4A5A52] disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
      {errorMessage && (
        <p className="text-sm text-[#8A3B2B]" role="alert">
          {errorMessage}
        </p>
      )}
    </section>
  );
}
