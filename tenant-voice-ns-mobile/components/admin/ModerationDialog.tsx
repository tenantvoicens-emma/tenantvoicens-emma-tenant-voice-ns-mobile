"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

export type ModerationActionKind =
  | "approve"
  | "reject"
  | "unpublish"
  | "approve-after-all";

export type ModerationAction = {
  kind: ModerationActionKind;
  reviewId: number;
  propertyName: string;
};

const NOTE_LIMIT = 500;

const actionCopy: Record<
  ModerationActionKind,
  {
    title: string;
    body: (propertyName: string) => string;
    confirm: string;
    placeholder: string;
    tone: "primary" | "danger";
  }
> = {
  approve: {
    title: "Approve this review?",
    body: (name) => `It will be published on the page for ${name}.`,
    confirm: "Approve and publish",
    placeholder: "e.g. Checked: no personal details",
    tone: "primary",
  },
  reject: {
    title: "Reject this review?",
    body: () =>
      "It won't be published. You can still approve it later from the Rejected tab.",
    confirm: "Reject",
    placeholder: "e.g. Names another tenant",
    tone: "danger",
  },
  unpublish: {
    title: "Unpublish this review?",
    body: (name) =>
      `It will be removed from the page for ${name} straight away. You can approve it again later from the Rejected tab.`,
    confirm: "Unpublish",
    placeholder: "e.g. Landlord takedown request: names a tenant",
    tone: "danger",
  },
  "approve-after-all": {
    title: "Approve this review after all?",
    body: (name) => `It will be published on the page for ${name} straight away.`,
    confirm: "Approve and publish",
    placeholder: "e.g. Appeal upheld after edits",
    tone: "primary",
  },
};

type ModerationDialogProps = {
  action: ModerationAction | null;
  isSaving: boolean;
  onConfirm: (note: string) => void;
  onCancel: () => void;
};

// Asks the moderator to confirm a decision, with an optional private note
// that's kept in the review's history.
export default function ModerationDialog({
  action,
  isSaving,
  onConfirm,
  onCancel,
}: ModerationDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (action && !dialog.open) {
      setNote("");
      dialog.showModal();
    } else if (!action && dialog.open) {
      dialog.close();
    }
  }, [action]);

  const copy = action ? actionCopy[action.kind] : null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onConfirm(note);
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="moderation-dialog-title"
      onCancel={(event) => {
        // Escape key: close through the parent so its state stays in step.
        event.preventDefault();
        if (!isSaving) {
          onCancel();
        }
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-3xl bg-white p-6 text-left text-[#1F2A24] shadow-xl backdrop:bg-black/40"
    >
      {action && copy && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <h2
            id="moderation-dialog-title"
            className="text-2xl font-bold tracking-tight text-[#294B3A]"
          >
            {copy.title}
          </h2>
          <p className="text-[#4A5A52]">{copy.body(action.propertyName)}</p>

          <div className="space-y-2">
            <label
              htmlFor="moderation-note"
              className="block font-medium text-[#4A5A52]"
            >
              Note <span className="font-normal text-[#66706B]">(optional, only moderators see it)</span>
            </label>
            <textarea
              id="moderation-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={NOTE_LIMIT}
              rows={3}
              placeholder={copy.placeholder}
              className="w-full rounded-2xl border border-[#D9D6CE] bg-white p-3 outline-none focus:border-[#08873A]"
            />
            <p className="text-right text-xs text-[#66706B]">
              {note.length}/{NOTE_LIMIT}
            </p>
          </div>

          <div className="space-y-2">
            <button
              type="submit"
              disabled={isSaving}
              className={
                copy.tone === "primary"
                  ? "w-full rounded-full bg-[#08873A] py-3 text-lg font-medium text-white disabled:opacity-60"
                  : "w-full rounded-full border border-[#E0C4BC] bg-white py-3 text-lg font-medium text-[#8A3B2B] disabled:opacity-60"
              }
            >
              {isSaving ? "Saving..." : copy.confirm}
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
