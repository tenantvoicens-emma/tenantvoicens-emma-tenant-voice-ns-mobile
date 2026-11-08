"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import Link from "next/link";

import ModerationDialog, {
  type ModerationAction,
  type ModerationActionKind,
} from "@/components/admin/ModerationDialog";
import FormMessages from "@/components/ui/FormMessages";
import PageContainer from "@/components/ui/PageContainer";
import SegmentedControl from "@/components/ui/SegmentedControl";
import EvidenceViewer from "@/components/admin/EvidenceViewer";
import LegalHoldControl, {
  type LegalHold,
} from "@/components/admin/LegalHoldControl";
import ModerationChecklist from "@/components/admin/ModerationChecklist";
import ReportsQueue from "@/components/admin/ReportsQueue";
import RemoveWordsDialog, {
  type RemoveWordsTarget,
} from "@/components/admin/RemoveWordsDialog";
import { formatCategory, OVERALL_CATEGORY } from "@/lib/ratings";
import { isModeratorEmail } from "@/lib/moderator";
import { isSmallRentalKind, rentalKindLabels } from "@/lib/rental-kind";
import { reviewIssueLabel } from "@/lib/review-issues";
import { supabase } from "@/lib/supabase";
import {
  refreshPendingCount,
  useAccountStatus,
} from "@/lib/use-account-status";

type RatingRow = {
  id: number;
  category: string;
  score: string;
};

type PendingReview = {
  id: number;
  review_text: string;
  occupancy_duration: string;
  would_live_again: string;
  // Problems the reviewer ticked from the fixed list.
  issues: string[];
  // Exact time, from get_review_submitted_at (the public reviews table
  // shows only published_on). Missing if that lookup failed.
  submitted_at?: string;
  // Words were removed by the moderator; the original is kept privately.
  moderator_edited: boolean;
  properties: {
    name: string;
    slug: string;
    address: string;
    city: string;
    is_listed: boolean;
    rental_kind: string | null;
    is_small_rental: boolean;
  } | null;
  property_ratings: RatingRow[];
};

type ModerationStatus = "approved" | "rejected";
type ReviewStatus = "pending" | "approved" | "rejected";

type HistoryEvent = {
  review_id: number;
  from_status: ReviewStatus;
  to_status: ModerationStatus;
  note: string | null;
  text_edited: boolean;
  created_at: string;
};

// What each action does to a review, and what to say once it's done.
const actionResults: Record<
  ModerationActionKind,
  { status: ModerationStatus; message: string }
> = {
  approve: { status: "approved", message: "Review approved and published." },
  reject: { status: "rejected", message: "Review rejected." },
  unpublish: {
    status: "rejected",
    message: "Review unpublished. It's no longer on the public site.",
  },
  "approve-after-all": {
    status: "approved",
    message: "Review approved and published.",
  },
};

const reviewStatuses: ReviewStatus[] = ["pending", "approved", "rejected"];
export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>("pending");
  // The Reports tab: reports visitors sent about published reviews.
  const [showReports, setShowReports] = useState(false);
  const { openReportCount } = useAccountStatus();
  const [loadedQueueKey, setLoadedQueueKey] = useState<string | null>(null);
  const [reviews, setReviews] = useState<PendingReview[]>([]);
  // Logged decisions per review; null when the history couldn't be loaded.
  const [history, setHistory] = useState<Record<number, HistoryEvent[]> | null>(
    {}
  );
  const [pendingAction, setPendingAction] = useState<ModerationAction | null>(
    null
  );
  // The writer's original words for reviews the moderator has edited.
  const [originals, setOriginals] = useState<Record<number, string>>({});
  const [evidenceCounts, setEvidenceCounts] = useState<Record<number, number>>({});
  const [holds, setHolds] = useState<Record<number, LegalHold>>({});
  const [removeTarget, setRemoveTarget] = useState<RemoveWordsTarget | null>(
    null
  );
  const [savingReviewId, setSavingReviewId] = useState<number | null>(null);
  const isSaving = savingReviewId !== null;
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const isAdmin = isModeratorEmail(session?.user.email);
  const activeQueueKey = session?.access_token
    ? `${session.access_token}:${reviewStatus}`
    : null;
  const isLoadingReviews =
    isAdmin && activeQueueKey !== null && activeQueueKey !== loadedQueueKey;

  useEffect(() => {
    let isActive = true;

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!isActive) {
        return;
      }

      if (error) {
        setErrorMessage("Could not check your sign-in status.");
      }
      setSession(data.session);
      setIsCheckingSession(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (isActive) {
        setSession(nextSession);
        setIsCheckingSession(false);
      }
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isAdmin || !session?.access_token) {
      return;
    }

    let isActive = true;
    const activeKey = `${session.access_token}:${reviewStatus}`;

    async function loadReviews() {
      const { data, error } = await supabase
        .from("reviews")
        .select(
          "id, review_text, occupancy_duration, would_live_again, issues, moderator_edited, properties(name, slug, address, city, is_listed, rental_kind, is_small_rental), property_ratings(id, category, score)"
        )
        .eq("status", reviewStatus)
        // Reviews are numbered in the order they were submitted.
        .order("id", { ascending: reviewStatus === "pending" });

      if (error) {
        throw error;
      }

      const normalizedReviews = (data ?? []).map((review) => ({
        ...review,
        properties: Array.isArray(review.properties)
          ? review.properties[0] ?? null
          : review.properties,
      })) as PendingReview[];

      if (normalizedReviews.length > 0) {
        const { data: times, error: timesError } = await supabase.rpc(
          "get_review_submitted_at",
          { p_review_ids: normalizedReviews.map((review) => review.id) }
        );
        if (timesError) {
          console.error("Could not load submission times.", timesError.code);
        } else {
          const timeByReview = new Map(
            ((times ?? []) as { review_id: number; submitted_at: string }[]).map(
              (row) => [row.review_id, row.submitted_at]
            )
          );
          for (const review of normalizedReviews) {
            review.submitted_at = timeByReview.get(review.id);
          }
        }
      }

      // Pending reviews have no decisions yet, so only decided ones need
      // their history. A failure here still shows the reviews.
      let historyByReview: Record<number, HistoryEvent[]> | null = {};
      if (reviewStatus !== "pending" && normalizedReviews.length > 0) {
        const { data: events, error: historyError } = await supabase.rpc(
          "get_moderation_history",
          { p_review_ids: normalizedReviews.map((review) => review.id) }
        );
        if (historyError) {
          console.error("Could not load moderation history.", historyError.code);
          historyByReview = null;
        } else {
          for (const event of (events ?? []) as HistoryEvent[]) {
            (historyByReview[event.review_id] ??= []).push(event);
          }
        }
      }

      // Originals of edited reviews. If they can't load, editing is
      // disabled for those reviews rather than checked against the wrong
      // text.
      const editedIds = normalizedReviews
        .filter((review) => review.moderator_edited)
        .map((review) => review.id);
      const originalsByReview: Record<number, string> = {};
      if (editedIds.length > 0) {
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

      // How many proof pictures each review has (the pictures themselves
      // load only when the moderator asks to see them).
      const countsByReview: Record<number, number> = {};
      if (normalizedReviews.length > 0) {
        const { data: countRows, error: countsError } = await supabase.rpc(
          "get_review_evidence_counts",
          { p_review_ids: normalizedReviews.map((review) => review.id) }
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
      if (normalizedReviews.length > 0) {
        const { data: holdRows, error: holdsError } = await supabase.rpc(
          "get_review_legal_holds",
          { p_review_ids: normalizedReviews.map((review) => review.id) }
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
        setReviews(normalizedReviews);
        setHistory(historyByReview);
        setOriginals(originalsByReview);
        setEvidenceCounts(countsByReview);
        setHolds(holdsByReview);
        setLoadedQueueKey(activeKey);
        setErrorMessage("");
      }
    }

    void loadReviews()
      .catch((error: unknown) => {
        console.error("Could not load moderated reviews.", error);
        if (isActive) {
          setErrorMessage("Reviews could not be loaded.");
          setLoadedQueueKey(activeKey);
        }
      });

    return () => {
      isActive = false;
    };
  }, [isAdmin, reviewStatus, session?.access_token]);

  async function moderateReview(action: ModerationAction, note: string) {
    if (!isAdmin || isSaving) {
      return;
    }

    const result = actionResults[action.kind];
    setSavingReviewId(action.reviewId);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc("moderate_review", {
      p_review_id: action.reviewId,
      p_status: result.status,
      p_note: note.trim() || null,
    });

    if (error) {
      console.error("Could not moderate review.", error.code);
      setErrorMessage("That review could not be updated. Please try again.");
    } else {
      // It now belongs to the other tab.
      setReviews((reviews) =>
        reviews.filter((review) => review.id !== action.reviewId)
      );
      setMessage(result.message);
      refreshPendingCount();
    }

    setSavingReviewId(null);
    setPendingAction(null);
  }

  async function saveRemoval(
    target: RemoveWordsTarget,
    editedText: string,
    note: string
  ) {
    if (!isAdmin || isSaving) {
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
    } else if (target.status === "approved") {
      // Still published, so it stays on this tab with its new text.
      const restored = editedText.trim() === target.originalText.trim();
      setReviews((reviews) =>
        reviews.map((review) =>
          review.id === target.reviewId
            ? {
                ...review,
                review_text: restored ? target.originalText : editedText.trim(),
                moderator_edited: !restored,
              }
            : review
        )
      );
      setOriginals((originals) => {
        const next = { ...originals };
        if (restored) {
          delete next[target.reviewId];
        } else {
          next[target.reviewId] = target.originalText;
        }
        return next;
      });
      setMessage(
        restored
          ? "The writer's words are restored."
          : "Edit saved. The published review now shows it."
      );
    } else {
      setReviews((reviews) =>
        reviews.filter((review) => review.id !== target.reviewId)
      );
      setMessage("Review approved with words removed, and published.");
      refreshPendingCount();
    }

    setSavingReviewId(null);
    setRemoveTarget(null);
  }

  function askToRemoveWords(review: PendingReview) {
    const savedOriginal = originals[review.id];
    if (review.moderator_edited && savedOriginal === undefined) {
      setErrorMessage(
        "The writer's original text couldn't be loaded, so this review can't be edited right now."
      );
      return;
    }
    setMessage("");
    setErrorMessage("");
    setRemoveTarget({
      reviewId: review.id,
      propertyName: review.properties?.name ?? "this building",
      status: reviewStatus,
      originalText: savedOriginal ?? review.review_text,
      currentText: review.review_text,
    });
  }

  function askToModerate(kind: ModerationActionKind, review: PendingReview) {
    const action: ModerationAction = {
      kind,
      reviewId: review.id,
      propertyName: review.properties?.name ?? "its property",
    };

    // Approving a pending review is the everyday case, so it's one tap.
    // Everything else confirms first and can carry a note.
    if (kind === "approve") {
      void moderateReview(action, "");
      return;
    }

    setMessage("");
    setErrorMessage("");
    setPendingAction(action);
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      setErrorMessage("Could not sign out. Please try again.");
    }
  }

  return (
    <div>
      <PageContainer width="wide">
        <div className="space-y-6">
          <header className="space-y-2">
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-[#294B3A]">
              Review moderation
            </h1>
            <p className="text-lg text-[#66706B]">
              Pending reviews are visible only to the authorized moderator.
            </p>
          </header>

          {isCheckingSession ? (
            <p className="text-[#66706B]" role="status">
              Checking sign-in status...
            </p>
          ) : !session ? (
            <section className="space-y-4 rounded-3xl border border-[#E6E3DA] bg-white p-6">
              <p className="text-lg text-[#4A5A52]">
                Sign in with the authorized admin account to review pending submissions.
              </p>
              <Link
                href="/account"
                className="flex min-h-12 w-full items-center justify-center rounded-full bg-[#08873A] px-5 text-lg font-medium text-white"
              >
                Sign in or create an account
              </Link>
            </section>
          ) : !isAdmin ? (
            <section className="space-y-4 rounded-3xl border border-[#E6E3DA] bg-white p-6">
              <p className="text-lg text-[#8A3B2B]" role="alert">
                This account is not authorized to moderate reviews.
              </p>
              <button
                type="button"
                onClick={signOut}
                className="min-h-11 rounded-full border border-[#D9D6CE] bg-white px-5 font-medium text-[#2F4F46]"
              >
                Sign out
              </button>
            </section>
          ) : (
            <section className="space-y-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[#66706B]">Signed in as admin</p>
                <button
                  type="button"
                  onClick={signOut}
                  className="min-h-11 rounded-full border border-[#D9D6CE] bg-white px-5 font-medium text-[#2F4F46]"
                >
                  Sign out
                </button>
              </div>

              <div className="space-y-3 lg:max-w-md">
                <SegmentedControl<"reviews" | "reports">
                  label="Moderation queue"
                  options={[
                    { value: "reviews", label: "Reviews" },
                    {
                      value: "reports",
                      label: openReportCount
                        ? `Reports (${openReportCount})`
                        : "Reports",
                    },
                  ]}
                  value={showReports ? "reports" : "reviews"}
                  onChange={(tab) => {
                    setShowReports(tab === "reports");
                    setMessage("");
                    setErrorMessage("");
                  }}
                />
                {!showReports && (
                  <SegmentedControl
                    label="Review status"
                    options={reviewStatuses.map((status) => ({
                      value: status,
                      label: capitalize(status),
                    }))}
                    value={reviewStatus}
                    onChange={(status) => {
                      setReviewStatus(status);
                      setMessage("");
                      setErrorMessage("");
                    }}
                  />
                )}
              </div>

              {showReports ? (
                <ReportsQueue accessToken={session.access_token} />
              ) : (
                <>
                  <ModerationChecklist />

                  <h2 className="text-3xl font-bold tracking-tight text-[#294B3A]">
                    {capitalize(reviewStatus)} reviews ({reviews.length})
                  </h2>

                  {isLoadingReviews ? (
                    <p className="text-[#66706B]" role="status">
                      Loading {reviewStatus} reviews...
                    </p>
                  ) : reviews.length === 0 ? (
                    <p className="text-[#66706B]">
                      {reviewStatus === "pending"
                        ? "The queue is clear."
                        : `No ${reviewStatus} reviews are archived yet.`}
                    </p>
                  ) : (
                    // Two cards per row on large screens.
                    <div className="space-y-5 lg:grid lg:grid-cols-2 lg:items-start lg:gap-5 lg:space-y-0">
                      {reviews.map((review) => (
                        <article
                          key={review.id}
                          className="space-y-4 rounded-3xl border border-[#E6E3DA] bg-white p-6"
                        >
                          <header className="space-y-1">
                            {review.properties &&
                              !review.properties.is_listed &&
                              !review.properties.is_small_rental && (
                                <p className="mb-2 rounded-2xl bg-[#FFF4D6] px-3 py-2 text-sm text-[#6B4E00]">
                                  <span className="font-semibold">New building</span>, added by
                                  this reviewer and not yet on the site. Check the address:
                                  approving this review publishes the building too.
                                </p>
                              )}
                            {review.properties?.is_small_rental && (
                              <p className="mb-2 rounded-2xl bg-[#FBF5E6] px-3 py-2 text-sm text-[#4A4030]">
                                <span className="font-semibold">
                                  Private rental
                                  {review.properties.rental_kind &&
                                  isSmallRentalKind(review.properties.rental_kind)
                                    ? ` · ${rentalKindLabels[review.properties.rental_kind as keyof typeof rentalKindLabels]}`
                                    : ""}
                                </span>
                                . Its landlord may know who wrote this: remove anything that
                                identifies the writer, the landlord, their family or roommates.
                                {!review.properties.is_listed &&
                                  " It stays off the site until a second review for it is approved."}
                              </p>
                            )}
                            <h3 className="text-xl font-bold text-[#294B3A]">
                              {review.properties?.name ?? "Unknown property"}
                            </h3>
                            {review.properties &&
                              review.properties.address !== review.properties.name && (
                                <p className="text-[#4A5A52]">{review.properties.address}</p>
                              )}
                            {review.properties?.city && (
                              <p className="text-[#4A5A52]">{review.properties.city}</p>
                            )}
                            <p className="text-sm text-[#66706B]">
                              Submitted{" "}
                              {review.submitted_at
                                ? new Date(review.submitted_at).toLocaleString()
                                : "(time unavailable)"}
                            </p>
                          </header>

                          <div className="flex flex-wrap gap-2">
                            <ReviewDetail
                              label="Lived here"
                              value={formatOccupancy(review.occupancy_duration)}
                            />
                            <ReviewDetail
                              label="Would live here again"
                              value={capitalize(review.would_live_again)}
                            />
                          </div>

                          {(review.issues ?? []).length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {review.issues.map((issue) => (
                                <ReviewDetail
                                  key={issue}
                                  label="Problem"
                                  value={reviewIssueLabel(issue)}
                                />
                              ))}
                            </div>
                          )}

                          {review.moderator_edited && (
                            <p className="inline-flex rounded-full bg-[#FFF4D6] px-3 py-1 text-sm font-medium text-[#6B4E00]">
                              Edited by a moderator
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
                            reviewId={review.id}
                            count={evidenceCounts[review.id] ?? 0}
                          />
                          {reviewStatus !== "pending" && (
                            <LegalHoldControl
                              reviewId={review.id}
                              hold={holds[review.id]}
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
                          )}
                          {review.moderator_edited && originals[review.id] !== undefined && (
                            <details className="rounded-2xl bg-[#F6F6EE] p-4 text-sm">
                              <summary className="cursor-pointer font-medium text-[#4A5A52]">
                                Writer&apos;s original (private)
                              </summary>
                              <p className="mt-2 whitespace-pre-wrap leading-relaxed text-[#4A5A52]">
                                {originals[review.id]}
                              </p>
                            </details>
                          )}

                          <RatingList
                            title="Property ratings"
                            ratings={review.property_ratings}
                          />

                          {reviewStatus !== "pending" && (
                            <ModerationHistory
                              events={history ? history[review.id] ?? [] : null}
                            />
                          )}

                          <div
                            className={`gap-3 border-t border-[#EEECE6] pt-4 ${reviewStatus === "pending" ? "grid grid-cols-2" : "flex flex-wrap"}`}
                          >
                            {reviewStatus !== "approved" && (
                              <button
                                type="button"
                                onClick={() =>
                                  askToModerate(
                                    reviewStatus === "pending" ? "approve" : "approve-after-all",
                                    review
                                  )
                                }
                                disabled={isSaving}
                                className="min-h-12 flex-1 rounded-full bg-[#08873A] px-5 text-lg font-medium text-white disabled:opacity-60"
                              >
                                {reviewStatus !== "pending"
                                  ? "Approve after all"
                                  : savingReviewId === review.id
                                    ? "Saving..."
                                    : "Approve"}
                              </button>
                            )}
                            {reviewStatus !== "rejected" && (
                              <button
                                type="button"
                                onClick={() =>
                                  askToModerate(
                                    reviewStatus === "pending" ? "reject" : "unpublish",
                                    review
                                  )
                                }
                                disabled={isSaving}
                                className="min-h-12 flex-1 rounded-full border border-[#E0C4BC] bg-white px-5 text-lg font-medium text-[#8A3B2B] disabled:opacity-60"
                              >
                                {reviewStatus === "pending" ? "Reject" : "Unpublish"}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => askToRemoveWords(review)}
                              disabled={isSaving}
                              className={`min-h-11 font-medium text-[#2F4F46] underline underline-offset-4 disabled:opacity-60 ${reviewStatus === "pending" ? "col-span-2" : "basis-full"}`}
                            >
                              {reviewStatus === "approved"
                                ? "Remove words"
                                : "Remove words and approve"}
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </>
              )}
            </section>
          )}

          {!showReports && (
            <FormMessages message={message} errorMessage={errorMessage} />
          )}
        </div>

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
              void moderateReview(pendingAction, note);
            }
          }}
          onCancel={() => setPendingAction(null)}
        />
      </PageContainer>
    </div>
  );
}

function RatingList({
  title,
  ratings,
}: {
  title: string;
  ratings: RatingRow[];
}) {
  return (
    <section className="space-y-1 border-t border-[#EEECE6] pt-3">
      <h4 className="text-sm font-semibold uppercase tracking-wide text-[#547160]">
        {title}
      </h4>
      {ratings.length === 0 ? (
        <p className="text-sm text-[#66706B]">No ratings provided.</p>
      ) : (
        <ul className="divide-y divide-[#EEECE6] text-sm">
          {overallFirst(ratings).map((rating) => (
            <li key={rating.id} className="flex justify-between gap-3 py-2">
              <span
                className={
                  rating.category === OVERALL_CATEGORY
                    ? "font-semibold text-gray-800"
                    : "text-gray-700"
                }
              >
                {formatCategory(rating.category)}
              </span>
              <span className="font-semibold tabular-nums text-[#294B3A]">
                {rating.score.toLowerCase() === "na" ? "N/A" : `${rating.score}/5`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function overallFirst(ratings: RatingRow[]) {
  return [...ratings].sort(
    (a, b) =>
      Number(b.category === OVERALL_CATEGORY) - Number(a.category === OVERALL_CATEGORY)
  );
}

const statusLabels: Record<ReviewStatus, string> = {
  pending: "Submitted",
  approved: "Approved",
  rejected: "Rejected",
};

// The private record of decisions on one review, oldest first.
function ModerationHistory({ events }: { events: HistoryEvent[] | null }) {
  return (
    <section className="space-y-2 rounded-2xl bg-[#F6F6EE] p-4">
      <h4 className="text-sm font-semibold uppercase tracking-wide text-[#547160]">
        Moderation history
      </h4>
      {events === null ? (
        <p className="text-sm text-[#66706B]">History could not be loaded.</p>
      ) : events.length === 0 ? (
        <p className="text-sm text-[#66706B]">
          Decided before history was recorded.
        </p>
      ) : (
        <ol className="space-y-2 text-sm">
          {events.map((event, index) => (
            <li key={index} className="space-y-0.5">
              <p className="text-[#1F2A24]">
                <span className="font-semibold">
                  {describeChange(event)}
                </span>
                <span className="text-[#66706B]">
                  {" · "}
                  {new Date(event.created_at).toLocaleString()}
                </span>
              </p>
              {event.note && (
                <p className="whitespace-pre-wrap text-[#4A5A52]">“{event.note}”</p>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function describeChange(event: HistoryEvent) {
  if (event.text_edited) {
    return event.from_status === event.to_status
      ? "Edited: words removed"
      : `${event.from_status === "rejected" ? "Approved after all" : "Approved"}, with words removed`;
  }
  if (event.from_status === "approved" && event.to_status === "rejected") {
    return "Unpublished";
  }
  if (event.from_status === "rejected" && event.to_status === "approved") {
    return "Approved after all";
  }
  return statusLabels[event.to_status];
}

function ReviewDetail({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F3F2EE] px-3 py-1 text-sm text-[#2F4F46]">
      <span>{label}</span>
      <span className="font-semibold">{value}</span>
    </span>
  );
}

function formatOccupancy(value: string) {
  const labels: Record<string, string> = {
    less_than_1_year: "less than 1 year",
    "1_to_3_years": "1 to 3 years",
    "4_to_6_years": "4 to 6 years",
    "7_to_10_years": "7 to 10 years",
    more_than_10_years: "more than 10 years",
  };

  return capitalize(labels[value] ?? value.replaceAll("_", " "));
}


function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}