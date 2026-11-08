"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Flag } from "lucide-react";
import { Turnstile } from "@marsidev/react-turnstile";

import { FLEXIBLE_TURNSTILE_STYLE } from "@/lib/turnstile";
import {
  isLegalConcern,
  LEGAL_CONCERN_MIN_DETAILS,
  looksLikeEmail,
  REPORT_DETAILS_LIMIT,
  reportReasons,
  type ReportReason,
} from "@/lib/review-reports";

const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

type Status = "editing" | "sending" | "sent";

// A legal-concern report hides the review at once (see submit_review_report).
const HIDES_REVIEW_REASON: ReportReason = "legal_concern";

// "Report this review" under a published review. Opens a short form; the
// report goes privately to the moderator, and the review stays up until
// they've looked at it.
export default function ReportReviewButton({ reviewId }: { reviewId: number }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | "">("");
  const [details, setDetails] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [status, setStatus] = useState<Status>("editing");
  // Whether the report that was just sent hid the review.
  const [wasHidden, setWasHidden] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileError, setTurnstileError] = useState(false);
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);

  function open() {
    if (status === "sent") {
      // A fresh form for a second report.
      setReason("");
      setDetails("");
      setContactEmail("");
      setWasHidden(false);
      setStatus("editing");
    }
    setErrorMessage("");
    setIsOpen(true);
    dialogRef.current?.showModal();
  }

  function close() {
    if (status === "sending") {
      return;
    }
    dialogRef.current?.close();
    setIsOpen(false);
  }

  function resetTurnstile() {
    setTurnstileToken("");
    setTurnstileResetKey((key) => key + 1);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") {
      return;
    }
    if (!reason) {
      setErrorMessage("Please choose a reason.");
      return;
    }
    const email = contactEmail.trim();
    if (isLegalConcern(reason)) {
      if (!email || !looksLikeEmail(email)) {
        setErrorMessage("A legal concern needs a valid email address so the moderator can reply.");
        return;
      }
      if (details.trim().length < LEGAL_CONCERN_MIN_DETAILS) {
        setErrorMessage(
          "Please explain the concern in a sentence or two: which part of the review, and why."
        );
        return;
      }
    }
    if (email && !looksLikeEmail(email)) {
      setErrorMessage("Please check the email address, or leave it blank.");
      return;
    }
    if (!turnstileToken) {
      setErrorMessage(
        "Please complete the security check above (tick the box if you see one), then press Send report again."
      );
      return;
    }

    setStatus("sending");
    setErrorMessage("");

    try {
      const response = await fetch("/api/review-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          turnstileToken,
          reviewId,
          reason,
          ...(details.trim() ? { details: details.trim() } : {}),
          ...(email ? { contactEmail: email } : {}),
        }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        hidden?: boolean;
      };
      if (!response.ok) {
        setErrorMessage(result.error ?? "We couldn’t send your report. Please try again.");
        setStatus("editing");
        resetTurnstile();
        return;
      }
      setWasHidden(result.hidden === true);
      setStatus("sent");
      resetTurnstile();
    } catch {
      setErrorMessage("We couldn’t reach the site. Please check your connection and try again.");
      setStatus("editing");
      resetTurnstile();
    }
  }

  const titleId = `report-review-${reviewId}-title`;

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-[#66706B] underline decoration-[#66706B]/40 underline-offset-4 hover:text-[#2F4F46] hover:decoration-[#2F4F46]"
      >
        <Flag aria-hidden="true" className="size-4" />
        Report this review
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onCancel={(event) => {
          // Escape key: close through our own handler so state stays in step.
          event.preventDefault();
          close();
        }}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-3xl bg-white p-6 text-left text-[#1F2A24] shadow-xl backdrop:bg-black/40"
      >
        {status === "sent" ? (
          <div className="space-y-4" role="status">
            <h2 id={titleId} className="text-2xl font-bold tracking-tight text-[#294B3A]">
              Thanks, your report was sent
            </h2>
            <p className="text-[#4A5A52]">
              The moderator will look at this review against our{" "}
              <Link href="/policies#review-guidelines" className="font-medium text-[#2F4F46] underline">
                review guidelines
              </Link>
              .{" "}
              {wasHidden
                ? "Because you reported a legal concern, the review has been hidden while they do."
                : "It stays up while they do."}
              {contactEmail.trim() && " If they need to, they'll reply by email."}
            </p>
            <button
              type="button"
              onClick={close}
              className="w-full rounded-full bg-[#08873A] py-3 text-lg font-medium text-white"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div className="space-y-2">
              <h2 id={titleId} className="text-2xl font-bold tracking-tight text-[#294B3A]">
                Report this review
              </h2>
              <p className="text-[#4A5A52]">
                Only the moderator sees reports. The review stays up until
                they&apos;ve checked it against our{" "}
                <Link href="/policies#review-guidelines" className="font-medium text-[#2F4F46] underline">
                  guidelines
                </Link>
                {reason === HIDES_REVIEW_REASON
                  ? ", except that a legal concern hides it right away."
                  : "."}
              </p>
            </div>

            <fieldset className="space-y-2">
              <legend className="mb-2 font-medium text-[#294B3A]">
                What&apos;s the problem?
              </legend>
              {reportReasons.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#E6E3DA] px-4 py-3 has-[:checked]:border-[#08873A] has-[:checked]:bg-[#F1F7EF]"
                >
                  <input
                    type="radio"
                    name={`report-reason-${reviewId}`}
                    value={option.value}
                    checked={reason === option.value}
                    onChange={() => setReason(option.value)}
                    className="mt-1 size-4 shrink-0 accent-[#08873A]"
                  />
                  <span>
                    <span className="block text-[#1F2A24]">{option.label}</span>
                    {"hint" in option && (
                      <span className="block text-sm text-[#66706B]">{option.hint}</span>
                    )}
                  </span>
                </label>
              ))}
            </fieldset>

            <div className="space-y-2">
              <label htmlFor={`report-details-${reviewId}`} className="block font-medium text-[#294B3A]">
                Details{" "}
                <span className="font-normal text-[#66706B]">
                  {isLegalConcern(reason) ? "(required)" : "(optional)"}
                </span>
              </label>
              <textarea
                id={`report-details-${reviewId}`}
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                maxLength={REPORT_DETAILS_LIMIT}
                rows={4}
                placeholder={
                  isLegalConcern(reason)
                    ? "Which part of the review is the concern, and why?"
                    : "e.g. Which part of the review, and why"
                }
                className="w-full rounded-2xl border border-[#D9D6CE] bg-white p-3 focus:border-[#08873A]"
              />
              <p className="text-right text-sm text-[#66706B]">
                {details.length}/{REPORT_DETAILS_LIMIT}
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor={`report-email-${reviewId}`} className="block font-medium text-[#294B3A]">
                Your email{" "}
                <span className="font-normal text-[#66706B]">
                  {isLegalConcern(reason) ? "(required)" : "(optional)"}
                </span>
              </label>
              <input
                id={`report-email-${reviewId}`}
                type="email"
                autoComplete="email"
                inputMode="email"
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value)}
                maxLength={254}
                className="w-full rounded-2xl border border-[#D9D6CE] bg-white p-3 focus:border-[#08873A]"
              />
              <p className="text-sm text-[#66706B]">
                {isLegalConcern(reason)
                  ? "So the moderator can reply. Never shown publicly."
                  : "Only if you&apos;d like a reply. Never shown publicly."}
              </p>
            </div>

            {/* Loaded only once the form is opened. */}
            {isOpen &&
              (turnstileSiteKey ? (
                <Turnstile
                  key={turnstileResetKey}
                  siteKey={turnstileSiteKey}
                  options={{ action: "review_report", theme: "light", size: "flexible" }}
                  style={FLEXIBLE_TURNSTILE_STYLE}
                  onSuccess={(token) => {
                    setTurnstileToken(token);
                    setTurnstileError(false);
                  }}
                  onExpire={() => setTurnstileToken("")}
                  onError={() => {
                    setTurnstileToken("");
                    setTurnstileError(true);
                  }}
                />
              ) : (
                <p className="text-red-700" role="alert">
                  Reporting isn&apos;t set up yet. Please email hello@tenantvoicens.ca instead.
                </p>
              ))}

            {turnstileError && (
              <p className="text-red-700" role="alert">
                The security check failed to load. Please refresh and try again.
              </p>
            )}

            {errorMessage && (
              <p className="rounded-2xl bg-[#FBEDE9] px-4 py-3 text-[#8A3B2B]" role="alert">
                {errorMessage}
              </p>
            )}

            <div className="space-y-2">
              <button
                type="submit"
                disabled={status === "sending" || !turnstileSiteKey}
                className="w-full rounded-full bg-[#08873A] py-3 text-lg font-medium text-white disabled:cursor-wait disabled:opacity-60"
              >
                {status === "sending" ? "Sending..." : "Send report"}
              </button>
              <button
                type="button"
                onClick={close}
                disabled={status === "sending"}
                className="w-full py-3 font-medium text-[#4A5A52] disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
