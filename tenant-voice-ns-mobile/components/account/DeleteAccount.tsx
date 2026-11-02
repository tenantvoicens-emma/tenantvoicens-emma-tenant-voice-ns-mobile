"use client";

import { useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type DeleteAccountProps = {
  session: Session;
  onDeleted: () => void;
};

// "Delete my account", confirmed in a dialog first.
export default function DeleteAccount({ session, onDeleted }: DeleteAccountProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function deleteAccount() {
    setIsDeleting(true);
    setErrorMessage("");
    try {
      const response = await fetch("/api/account", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        setErrorMessage(
          body?.error ?? "We couldn't delete your account. Please try again."
        );
        return;
      }
      dialogRef.current?.close();
      // The account is gone; clear the saved sign-in on this device.
      await supabase.auth.signOut({ scope: "local" });
      onDeleted();
    } catch {
      setErrorMessage("We couldn't reach the server. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setErrorMessage("");
          dialogRef.current?.showModal();
          // Start on the safe choice. (React's autoFocus doesn't apply to
          // a dialog opened later, so the browser would otherwise pick the
          // first button: the delete button.)
          cancelRef.current?.focus();
        }}
        className="w-full py-3 font-medium text-[#8A3B2B] underline decoration-[#8A3B2B]/30 underline-offset-4"
      >
        Delete my account
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="delete-account-title"
        className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-3xl bg-white p-6 text-left text-[#1F2A24] shadow-xl backdrop:bg-black/40"
      >
        <div className="space-y-4">
          <h2
            id="delete-account-title"
            className="text-2xl font-bold tracking-tight text-[#294B3A]"
          >
            Delete your account?
          </h2>
          <p className="text-[#4A5A52]">
            Your email address and password are deleted for good, and this
            can&apos;t be undone. Reviews you&apos;ve submitted stay on the
            site, still anonymous, but are no longer linked to you.
          </p>
          {errorMessage && (
            <p
              className="rounded-2xl bg-[#FBEDE9] px-4 py-3 text-[#8A3B2B]"
              role="alert"
            >
              {errorMessage}
            </p>
          )}
          <div className="space-y-2">
            <button
              type="button"
              onClick={deleteAccount}
              disabled={isDeleting}
              className="w-full rounded-full bg-[#8A3B2B] py-3 text-lg font-medium text-white disabled:opacity-60"
            >
              {isDeleting ? "Deleting..." : "Delete my account"}
            </button>
            <button
              type="button"
              ref={cancelRef}
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
