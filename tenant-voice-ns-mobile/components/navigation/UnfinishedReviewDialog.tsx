"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { reviewFormHref, writeDraft, type ReviewDraft } from "@/lib/review-draft";

type AskAboutDraft = (draft: ReviewDraft, startHref: string) => void;

const UnfinishedReviewContext = createContext<AskAboutDraft | null>(null);

// Opens the one "You have an unfinished review" dialog. Every link that
// starts a new review (the Review pills in the header and footer, "Share
// Your Experience", "Add it") shares it, so the page has a single copy.
export function useUnfinishedReviewDialog() {
  return useContext(UnfinishedReviewContext);
}

type PendingStart = {
  draft: ReviewDraft;
  // Where "Delete it and start new" goes.
  startHref: string;
};

export function UnfinishedReviewDialogProvider({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState<PendingStart | null>(null);

  const askAboutDraft = useCallback<AskAboutDraft>((draft, startHref) => {
    setPending({ draft, startHref });
    dialogRef.current?.showModal();
  }, []);

  const value = useMemo(() => askAboutDraft, [askAboutDraft]);

  function continueDraft() {
    dialogRef.current?.close();
    router.push(reviewFormHref({ propertySlug: pending?.draft.propertySlug }));
  }

  function discardAndStart() {
    dialogRef.current?.close();
    writeDraft(null);
    router.push(pending?.startHref ?? "/submit-review");
  }

  const draftPropertyName = pending?.draft.propertySlug
    ? pending.draft.searchTerm
    : "";

  return (
    <UnfinishedReviewContext.Provider value={value}>
      {children}

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
    </UnfinishedReviewContext.Provider>
  );
}
