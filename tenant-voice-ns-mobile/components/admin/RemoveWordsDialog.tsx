"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { isRemovalOnly, removedPieces } from "@/lib/moderator-edit";

export type RemoveWordsTarget = {
  reviewId: number;
  propertyName: string;
  status: "pending" | "approved" | "rejected";
  // The writer's own words (the saved original if it was edited before).
  originalText: string;
  // What the review says now.
  currentText: string;
};

type RemoveWordsDialogProps = {
  target: RemoveWordsTarget | null;
  isSaving: boolean;
  onConfirm: (editedText: string, note: string) => void;
  onCancel: () => void;
};

const NOTE_LIMIT = 500;

// Edit a review by deleting words only, then approve it (or, for a
// published review, save the edit). Shows what will be removed, and won't
// save anything that adds or changes words; the database checks it too.
export default function RemoveWordsDialog({
  target,
  isSaving,
  onConfirm,
  onCancel,
}: RemoveWordsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [text, setText] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (target && !dialog.open) {
      setText(target.currentText);
      setNote("");
      dialog.showModal();
    } else if (!target && dialog.open) {
      dialog.close();
    }
  }, [target]);

  const original = target?.originalText ?? "";
  const isValid = isRemovalOnly(original, text);
  const isUnchanged = text.trim() === (target?.currentText ?? "").trim();
  const isOriginal = text.trim() === original.trim();
  const pieces = isValid ? removedPieces(original, text) : [];
  const removesSomething = pieces.some((piece) => piece.removed);
  // A published review needs an actual change; approving a pending or
  // rejected one with the text as it is would just be a plain approval.
  const canSave = isValid && !isUnchanged;

  const confirmLabel =
    target?.status === "approved"
      ? isOriginal
        ? "Restore the writer’s words"
        : "Save edit"
      : "Approve with words removed";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (canSave) {
      onConfirm(text, note);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="remove-words-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!isSaving) {
          onCancel();
        }
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-xl rounded-3xl bg-white p-6 text-left text-[#1F2A24] shadow-xl backdrop:bg-black/40"
    >
      {target && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <h2
            id="remove-words-title"
            className="text-2xl font-bold tracking-tight text-[#294B3A]"
          >
            Remove words
          </h2>
          <p className="text-[#4A5A52]">
            Delete only the problem words or sentences in this review of{" "}
            {target.propertyName}: names, identifying details or accusations
            stated as fact. Don&apos;t add or change anything. If the review
            wouldn&apos;t make sense without them, reject it instead.
          </p>

          <div className="space-y-2">
            <label htmlFor="remove-words-text" className="block font-medium text-[#4A5A52]">
              Review text
            </label>
            <textarea
              id="remove-words-text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={8}
              aria-describedby="remove-words-check"
              className="w-full rounded-2xl border border-[#D9D6CE] bg-white p-3 leading-relaxed focus:border-[#08873A]"
            />
            <div id="remove-words-check" aria-live="polite">
              {!isValid ? (
                <p className="rounded-2xl bg-[#FBEDE9] px-4 py-3 text-[#8A3B2B]" role="alert">
                  {text.trim() === ""
                    ? "The review can't be empty. Reject it instead."
                    : "Only remove words. Something was added, changed or moved: undo that, or start again from the writer's words."}
                </p>
              ) : removesSomething ? (
                <div className="space-y-1 rounded-2xl bg-[#F6F6EE] px-4 py-3">
                  <p className="text-sm font-medium text-[#4A5A52]">
                    Removed from the writer&apos;s words:
                  </p>
                  <p className="leading-relaxed text-[#4A5A52]">
                    {pieces.map((piece, index) =>
                      piece.removed ? (
                        <del
                          key={index}
                          className="rounded bg-[#FBEDE9] px-0.5 text-[#8A3B2B]"
                        >
                          {piece.text}
                        </del>
                      ) : (
                        <span key={index}>{piece.text}</span>
                      )
                    ).flatMap((element, index) => (index === 0 ? [element] : [" ", element]))}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-[#66706B]">
                  Delete the words to remove. Nothing is removed yet.
                </p>
              )}
            </div>
            {!isOriginal && (
              <button
                type="button"
                onClick={() => setText(original)}
                className="text-sm font-medium text-[#2F4F46] underline underline-offset-4"
              >
                Start again from the writer&apos;s words
              </button>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="remove-words-note" className="block font-medium text-[#4A5A52]">
              Note{" "}
              <span className="font-normal text-[#66706B]">
                (optional, only moderators see it)
              </span>
            </label>
            <textarea
              id="remove-words-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={NOTE_LIMIT}
              rows={2}
              placeholder="e.g. Removed a staff member's name"
              className="w-full rounded-2xl border border-[#D9D6CE] bg-white p-3 focus:border-[#08873A]"
            />
          </div>

          <p className="text-sm text-[#66706B]">
            {isOriginal
              ? "The review will show the writer's words exactly."
              : "The published review will be marked “Edited by a moderator”. The writer's original stays private in the moderation area."}
          </p>

          <div className="space-y-2">
            <button
              type="submit"
              disabled={isSaving || !canSave}
              className="w-full rounded-full bg-[#08873A] py-3 text-lg font-medium text-white disabled:opacity-60"
            >
              {isSaving ? "Saving..." : confirmLabel}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={isSaving}
              className="w-full py-3 font-medium text-[#4A5A52] disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
