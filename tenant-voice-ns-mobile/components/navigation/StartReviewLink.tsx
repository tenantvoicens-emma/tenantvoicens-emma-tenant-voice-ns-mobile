"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type MouseEvent, type ReactNode } from "react";
import {
  hasUnsavedWork,
  readDraft,
  writeDraft,
  type ReviewDraft,
} from "@/lib/review-draft";

type StartReviewLinkProps = {
  // The property the new review is for, if the link starts one for a
  // specific property.
  propertySlug?: string;
  className?: string;
  children: ReactNode;
} & Pick<React.ComponentProps<typeof Link>, "aria-current">;

// A link that opens a fresh review form. If an unfinished review would be
// thrown away, it asks first: continue it, or discard it and start over.
export default function StartReviewLink({
  propertySlug,
  className,
  children,
  ...linkProps
}: StartReviewLinkProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pendingDraft, setPendingDraft] = useState<ReviewDraft | null>(null);
  const href = propertySlug
    ? `/submit-review?property=${encodeURIComponent(propertySlug)}`
    : "/submit-review";

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    const draft = readDraft();

    // Reopening the same property's review just continues it.
    if (propertySlug && draft?.propertySlug === propertySlug) {
      return;
    }

    if (!hasUnsavedWork(draft)) {
      writeDraft(null);
      return;
    }

    event.preventDefault();
    setPendingDraft(draft);
    dialogRef.current?.showModal();
  }

  function continueDraft() {
    dialogRef.current?.close();
    router.push(
      pendingDraft?.propertySlug
        ? `/submit-review?property=${encodeURIComponent(pendingDraft.propertySlug)}`
        : "/submit-review"
    );
  }

  function discardAndStart() {
    dialogRef.current?.close();
    writeDraft(null);
    router.push(href);
  }

  const draftPropertyName = pendingDraft?.propertySlug
    ? pendingDraft.searchTerm
    : "";

  return (
    <>
      <Link href={href} onClick={handleClick} className={className} {...linkProps}>
        {children}
      </Link>

      <dialog
        ref={dialogRef}
        aria-labelledby="unfinished-review-title"
        className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-3xl bg-white p-6 text-left text-[#1F2A24] shadow-xl backdrop:bg-black/40"
      >
        <div className="space-y-4">
          <h2
            id="unfinished-review-title"
            className="text-2xl font-bold tracking-tight text-[#294B3A]"
          >
            You have an unfinished review
          </h2>
          <p className="text-[#4A5A52]">
            {draftPropertyName
              ? `Your review of ${draftPropertyName} hasn't been submitted yet.`
              : "Your review hasn't been submitted yet."}{" "}
            Starting a new one will delete it.
          </p>
          <div className="space-y-2">
            <button
              type="button"
              onClick={continueDraft}
              autoFocus
              className="w-full rounded-full bg-[#08873A] py-3 text-lg font-medium text-white"
            >
              Continue my review
            </button>
            <button
              type="button"
              onClick={discardAndStart}
              className="w-full rounded-full border border-[#E0C4BC] py-3 text-lg font-medium text-[#8A3B2B]"
            >
              Delete it and start new
            </button>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="w-full py-3 font-medium text-[#4A5A52]"
            >
              Cancel
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
