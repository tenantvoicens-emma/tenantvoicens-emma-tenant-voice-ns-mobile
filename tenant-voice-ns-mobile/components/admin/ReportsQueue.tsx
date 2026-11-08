"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import EvidenceViewer from "@/components/admin/EvidenceViewer";
import LegalHoldControl, {
  type LegalHold,
} from "@/components/admin/LegalHoldControl";
import ModerationDialog, {
  type ModerationAction,
} from "@/components/admin/ModerationDialog";
import RemoveWordsDialog, {
  type RemoveWordsTarget,
} from "@/components/admin/RemoveWordsDialog";
import FormMessages from "@/components/ui/FormMessages";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { reportReasonLabel } from "@/lib/review-reports";
import { supabase } from "@/lib/supabase";
import { refreshPendingCount } from "@/lib/use-account-status";

type ReportRow = {
  report_id: number;
  review_id: number;
  reason: string;
  details: string | null;
  contact_email: string | null;
  status: "open" | "dismissed" | "actioned";
  resolution_note: string | null;
  created_at: string;
  resolved_at: string | null;
  review_text: string;
  review_status: "pending" | "approved" | "rejected";
  moderator_edited: boolean;
  property_name: string | null;
  property_slug: string | null;
  property_address: string | null;
  property_city: string | null;
  is_small_rental: boolean | null;
};

// One card per reported review, with every report about it.
type ReportedReview = {
  reviewId: number;
  first: ReportRow;
  reports: ReportRow[];
};

type View = "open" | "closed";

type Props = {
  // Changes when the moderator signs in again, so the list reloads.
  accessToken: string;
};

// The Reports tab on the moderation page: reports visitors sent about
// published reviews. Reported reviews stay up until the moderator decides
// here (keep it up, remove words, or unpublish it), except a "Legal concern"
// report, which hides the review at once. Those wait here to be restored or
// kept down.
export default function ReportsQueue({ accessToken }: Props) {
  const [view, setView] = useState<View>("open");
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [originals, setOriginals] = useState<Record<number, string>>({});
  const [evidenceCounts, setEvidenceCounts] = useState<Record<number, number>>({});
  const [holds, setHolds] = useState<Record<number, LegalHold>>({});
  const [pendingAction, setPendingAction] = useState<
    ModerationAction<"keep-up" | "unpublish" | "approve-after-all"> | null
  >(null);
  const [removeTarget, setRemoveTarget] = useState<RemoveWordsTarget | null>(null);
  const [savingReviewId, setSavingReviewId] = useState<number | null>(null);
  const isSaving = savingReviewId !== null;
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const activeKey = `${accessToken}:${view}`;
  const isLoading = loadedKey !== activeKey;

  useEffect(() => {
    let isActive = true;
    const key = `${accessToken}:${view}`;

    async function load() {
      const { data, error } = await supabase.rpc("get_review_reports", {
        p_open: view === "open",
      });
      if (error) {
        throw error;
      }
      const reportRows = (data ?? []) as ReportRow[];

      // Originals of edited reviews, so "Remove words" checks against the
      // writer's own text.
      const editedIds = [
        ...new Set(
          reportRows.filter((row) => row.moderator_edited).map((row) => row.review_id)
        ),
      ];
      const originalsByReview: Record<number, string> = {};
      if (view === "open" && editedIds.length > 0) {
        const { data: originalRows, error: originalsError } = await supabase.rpc(
          "get_review_originals",
          { p_review_ids: editedIds }
        );
        if (originalsError) {
          console.error("Could not load original review text.", originalsError.code);
        } else {
          for (const row of (originalRows ?? []) as {
            review_id: number;
            original_text: string;
          }[]) {
            originalsByReview[row.review_id] = row.original_text;
          }
        }
      }

      // How many proof pictures each reported review has.
      const countsByReview: Record<number, number> = {};
      const reviewIds = [...new Set(reportRows.map((row) => row.review_id))];
      if (reviewIds.length > 0) {
        const { data: countRows, error: countsError } = await supabase.rpc(
          "get_review_evidence_counts",
          { p_review_ids: reviewIds }
        );
        if (countsError) {
          console.error("Could not load evidence counts.", countsError.code);
        } else {
          for (const row of (countRows ?? []) as {
            review_id: number;
            evidence_count: number;
          }[]) {
            countsByReview[row.review_id] = row.evidence_count;
          }
        }
      }

      // Reviews on a legal hold.
      const holdsByReview: Record<number, LegalHold> = {};
      if (reviewIds.length > 0) {
        const { data: holdRows, error: holdsError } = await supabase.rpc(
          "get_review_legal_holds",
          { p_review_ids: reviewIds }
        );
        if (holdsError) {
          console.error("Could not load legal holds.", holdsError.code);
        } else {
          for (const row of (holdRows ?? []) as (LegalHold & { review_id: number })[]) {
            holdsByReview[row.review_id] = { placed_at: row.placed_at, note: row.note };
          }
        }
      }

      if (isActive) {
        setRows(reportRows);
        setOriginals(originalsByReview);
        setEvidenceCounts(countsByReview);
        setHolds(holdsByReview);
        setLoadedKey(key);
        setErrorMessage("");
      }
    }

    void load().catch((error: unknown) => {
      console.error("Could not load reports.", error);
      if (isActive) {
        setRows([]);
        setErrorMessage("Reports could not be loaded.");
        setLoadedKey(key);
      }
    });

    return () => {
      isActive = false;
    };
  }, [accessToken, view]);

  const grouped = groupByReview(rows);

  function removeFromList(reviewId: number) {
    setRows((current) => current.filter((row) => row.review_id !== reviewId));
  }

  async function closeReports(
    reviewId: number,
    resolution: "dismissed" | "actioned",
    note: string
  ) {
    const { error } = await supabase.rpc("resolve_review_reports", {
      p_review_id: reviewId,
      p_resolution: resolution,
      p_note: note.trim() || null,
    });
    if (error) {
      console.error("Could not close reports.", error.code);
      return false;
    }
    removeFromList(reviewId);
    refreshPendingCount();
    return true;
  }

  async function confirmAction(
    action: ModerationAction<"keep-up" | "unpublish" | "approve-after-all">,
    note: string
  ) {
    if (isSaving) {
      return;
    }
    setSavingReviewId(action.reviewId);
    setMessage("");
    setErrorMessage("");

    if (action.kind === "unpublish") {
      const { error } = await supabase.rpc("moderate_review", {
        p_review_id: action.reviewId,
        p_status: "rejected",
        p_note: note.trim() || null,
      });
      if (error) {
        console.error("Could not unpublish review.", error.code);
        setErrorMessage("That review could not be unpublished. Please try again.");
      } else if (await closeReports(action.reviewId, "actioned", note)) {
        setMessage("Review unpublished and its reports closed.");
      } else {
        setErrorMessage(
          "The review was unpublished, but its reports couldn't be closed. Use “Close reports” to try again."
        );
        markUnpublished(action.reviewId);
      }
    } else if (action.kind === "approve-after-all") {
      const { error } = await supabase.rpc("moderate_review", {
        p_review_id: action.reviewId,
        p_status: "approved",
        p_note: note.trim() || null,
      });
      if (error) {
        console.error("Could not restore review.", error.code);
        setErrorMessage("That review could not be restored. Please try again.");
      } else if (await closeReports(action.reviewId, "dismissed", note)) {
        setMessage("Review restored and published again. Its reports are closed.");
      } else {
        setErrorMessage(
          "The review was restored, but its reports couldn't be closed. Please reload and close them."
        );
      }
    } else if (await closeReports(action.reviewId, "dismissed", note)) {
      setMessage("Reports closed. The review stays up.");
    } else {
      setErrorMessage("The reports couldn't be closed. Please try again.");
    }

    setSavingReviewId(null);
    setPendingAction(null);
  }

  function markUnpublished(reviewId: number) {
    setRows((current) =>
      current.map((row) =>
        row.review_id === reviewId ? { ...row, review_status: "rejected" } : row
      )
    );
  }

  async function closeAfterDecision(reviewId: number) {
    if (isSaving) {
      return;
    }
    setSavingReviewId(reviewId);
    setMessage("");
    setErrorMessage("");
    if (await closeReports(reviewId, "actioned", "")) {
      setMessage("Reports closed.");
    } else {
      setErrorMessage("The reports couldn't be closed. Please try again.");
    }
    setSavingReviewId(null);
  }

  async function saveRemoval(target: RemoveWordsTarget, editedText: string, note: string) {
    if (isSaving) {
      return;
    }
    setSavingReviewId(target.reviewId);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc("moderate_review", {
      p_review_id: target.reviewId,
      p_status: "approved",
      p_note: note.trim() || null,
      p_edited_text: editedText,
    });

    if (error) {
      console.error("Could not save the edited review.", error.code);
      setErrorMessage(
        "The edit couldn't be saved. Edits can only remove words; please try again."
      );
    } else if (await closeReports(target.reviewId, "actioned", note)) {
      setMessage("Edit saved and the reports closed. The published review now shows it.");
    } else {
      setErrorMessage(
        "The edit was saved, but the reports couldn't be closed. Use “Close reports” to try again."
      );
    }

    setSavingReviewId(null);
    setRemoveTarget(null);
  }

  function askToRemoveWords(group: ReportedReview) {
    const savedOriginal = originals[group.reviewId];
    if (group.first.moderator_edited && savedOriginal === undefined) {
      setErrorMessage(
        "The writer's original text couldn't be loaded, so this review can't be edited right now."
      );
      return;
    }
    setMessage("");
    setErrorMessage("");
    setRemoveTarget({
      reviewId: group.reviewId,
      propertyName: group.first.property_name ?? "this building",
      status: "approved",
      originalText: savedOriginal ?? group.first.review_text,
      currentText: group.first.review_text,
    });
  }

  function ask(
    kind: "keep-up" | "unpublish" | "approve-after-all",
    group: ReportedReview
  ) {
    setMessage("");
    setErrorMessage("");
    setPendingAction({
      kind,
      reviewId: group.reviewId,
      propertyName: group.first.property_name ?? "its property",
    });
  }

  return (
    <div className="space-y-5">
      <div className="lg:max-w-xs">
        <SegmentedControl
          label="Which reports"
          options={[
            { value: "open", label: "Open" },
            { value: "closed", label: "Closed" },
          ]}
          value={view}
          onChange={(next) => {
            setView(next);
            setMessage("");
            setErrorMessage("");
          }}
        />
      </div>

      <p className="text-[#66706B]">
        {view === "open"
          ? "Reported reviews stay up until you decide, except a legal concern: that hides the review at once. Check each against the guidelines: keep it up, remove the words that break them, or unpublish it. For a hidden review, restore it or keep it down."
          : "The 200 most recently closed reports. Closed reports are deleted 24 months after they were closed."}
      </p>

      <h2 className="text-3xl font-bold tracking-tight text-[#294B3A]">
        {view === "open" ? "Open reports" : "Closed reports"} ({rows.length})
      </h2>

      <FormMessages message={message} errorMessage={errorMessage} />

      {isLoading ? (
        <p className="text-[#66706B]" role="status">
          Loading reports...
        </p>
      ) : grouped.length === 0 ? (
        <p className="text-[#66706B]">
          {view === "open" ? "No open reports." : "No closed reports yet."}
        </p>
      ) : (
        <div className="space-y-5 lg:grid lg:grid-cols-2 lg:items-start lg:gap-5 lg:space-y-0">
          {grouped.map((group) => {
            const review = group.first;
            const isPublished = review.review_status === "approved";
            // A legal-concern report took this review down automatically.
            const wasAutoHidden =
              !isPublished &&
              review.review_status === "rejected" &&
              group.reports.some((report) => report.reason === "legal_concern");
            return (
              <article
                key={group.reviewId}
                className="space-y-4 rounded-3xl border border-[#E6E3DA] bg-white p-6"
              >
                <header className="space-y-1">
                  {review.is_small_rental && (
                    <p className="mb-2 rounded-2xl bg-[#FBF5E6] px-3 py-2 text-sm text-[#4A4030]">
                      <span className="font-semibold">Private rental</span>. Its
                      landlord may know who wrote this review.
                    </p>
                  )}
                  <h3 className="text-xl font-bold text-[#294B3A]">
                    {review.property_slug && isPublished ? (
                      <Link
                        href={`/properties/${review.property_slug}#review-${group.reviewId}`}
                        className="underline decoration-[#2F4F46]/30 underline-offset-4 hover:decoration-[#2F4F46]"
                      >
                        {review.property_name ?? "Unknown property"}
                      </Link>
                    ) : (
                      review.property_name ?? "Unknown property"
                    )}
                  </h3>
                  {review.property_address &&
                    review.property_address !== review.property_name && (
                      <p className="text-[#4A5A52]">{review.property_address}</p>
                    )}
                  {review.property_city && (
                    <p className="text-[#4A5A52]">{review.property_city}</p>
                  )}
                  <p className="text-sm text-[#66706B]">
                    Review is{" "}
                    <span className="font-medium text-[#4A5A52]">
                      {isPublished
                        ? "published"
                        : review.review_status === "rejected"
                          ? "unpublished"
                          : "pending"}
                    </span>
                    {review.moderator_edited && " · edited by a moderator"}
                  </p>
                </header>

                {wasAutoHidden && view === "open" && (
                  <p className="rounded-2xl bg-[#FBEDE9] px-4 py-3 text-sm text-[#8A3B2B]" role="status">
                    <span className="font-semibold">Hidden automatically.</span>{" "}
                    A legal concern was reported, so this review came down
                    straight away. Restore it or keep it down.
                  </p>
                )}

                {review.review_text.trim() ? (
                  <p className="whitespace-pre-wrap leading-relaxed text-gray-800">
                    {review.review_text}
                  </p>
                ) : (
                  <p className="text-[#66706B]">
                    No written review. Ratings and ticked problems only.
                  </p>
                )}

                <EvidenceViewer
                  reviewId={group.reviewId}
                  count={evidenceCounts[group.reviewId] ?? 0}
                />

                <LegalHoldControl
                  reviewId={group.reviewId}
                  hold={holds[group.reviewId]}
                  onChange={(reviewId, hold) =>
                    setHolds((current) => {
                      const next = { ...current };
                      if (hold) {
                        next[reviewId] = hold;
                      } else {
                        delete next[reviewId];
                      }
                      return next;
                    })
                  }
                />

                <section className="space-y-3 rounded-2xl bg-[#FBEDE9]/60 p-4">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-[#8A3B2B]">
                    {group.reports.length === 1
                      ? "1 report"
                      : `${group.reports.length} reports`}
                  </h4>
                  <ol className="space-y-3 text-sm">
                    {group.reports.map((report) => (
                      <li key={report.report_id} className="space-y-1">
                        <p className="text-[#1F2A24]">
                          <span className="font-semibold">
                            {reportReasonLabel(report.reason)}
                          </span>
                          <span className="text-[#66706B]">
                            {" · "}
                            {new Date(report.created_at).toLocaleString()}
                          </span>
                        </p>
                        {report.details && (
                          <p className="whitespace-pre-wrap text-[#4A5A52]">
                            “{report.details}”
                          </p>
                        )}
                        {report.contact_email && (
                          <p className="text-[#4A5A52]">
                            Reply to:{" "}
                            <a
                              href={`mailto:${report.contact_email}`}
                              className="font-medium text-[#2F4F46] underline break-all"
                            >
                              {report.contact_email}
                            </a>
                          </p>
                        )}
                        {view === "closed" && (
                          <p className="text-[#66706B]">
                            {report.status === "actioned"
                              ? "Acted on"
                              : "Kept up"}
                            {report.resolved_at &&
                              ` · ${new Date(report.resolved_at).toLocaleString()}`}
                            {report.resolution_note && ` · “${report.resolution_note}”`}
                          </p>
                        )}
                      </li>
                    ))}
                  </ol>
                </section>

                {view === "open" && (
                  <div className="flex flex-wrap gap-3 border-t border-[#EEECE6] pt-4">
                    {isPublished ? (
                      <>
                        <button
                          type="button"
                          onClick={() => ask("keep-up", group)}
                          disabled={isSaving}
                          className="min-h-12 flex-1 rounded-full bg-[#08873A] px-5 text-lg font-medium text-white disabled:opacity-60"
                        >
                          Keep it up
                        </button>
                        <button
                          type="button"
                          onClick={() => ask("unpublish", group)}
                          disabled={isSaving}
                          className="min-h-12 flex-1 rounded-full border border-[#E0C4BC] bg-white px-5 text-lg font-medium text-[#8A3B2B] disabled:opacity-60"
                        >
                          Unpublish
                        </button>
                        <button
                          type="button"
                          onClick={() => askToRemoveWords(group)}
                          disabled={isSaving}
                          className="min-h-11 basis-full font-medium text-[#2F4F46] underline underline-offset-4 disabled:opacity-60"
                        >
                          Remove words
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="basis-full text-sm text-[#66706B]">
                          This review is no longer published.
                        </p>
                        <button
                          type="button"
                          onClick={() => ask("approve-after-all", group)}
                          disabled={isSaving}
                          className="min-h-12 flex-1 rounded-full bg-[#08873A] px-5 text-lg font-medium text-white disabled:opacity-60"
                        >
                          Restore review
                        </button>
                        <button
                          type="button"
                          onClick={() => void closeAfterDecision(group.reviewId)}
                          disabled={isSaving}
                          className="min-h-12 flex-1 rounded-full border border-[#E0C4BC] bg-white px-5 text-lg font-medium text-[#8A3B2B] disabled:opacity-60"
                        >
                          {savingReviewId === group.reviewId
                            ? "Saving..."
                            : wasAutoHidden
                              ? "Keep it down"
                              : "Close reports"}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <RemoveWordsDialog
        target={removeTarget}
        isSaving={isSaving}
        onConfirm={(editedText, note) => {
          if (removeTarget) {
            void saveRemoval(removeTarget, editedText, note);
          }
        }}
        onCancel={() => setRemoveTarget(null)}
      />

      <ModerationDialog
        action={pendingAction}
        isSaving={isSaving}
        onConfirm={(note) => {
          if (pendingAction) {
            void confirmAction(pendingAction, note);
          }
        }}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  );
}

function groupByReview(rows: ReportRow[]): ReportedReview[] {
  const groups = new Map<number, ReportedReview>();
  for (const row of rows) {
    const group = groups.get(row.review_id);
    if (group) {
      group.reports.push(row);
    } else {
      groups.set(row.review_id, { reviewId: row.review_id, first: row, reports: [row] });
    }
  }
  return [...groups.values()];
}
