"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import Link from "next/link";

import BackLink from "@/components/navigation/BackLink";
import PageContainer from "@/components/ui/PageContainer";
import { supabase } from "@/lib/supabase";

const ADMIN_EMAIL = "tenantvoicens@gmail.com";

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
  created_at: string;
  properties: {
    name: string;
    slug: string;
  } | null;
  property_ratings: RatingRow[];
  landlord_ratings: RatingRow[];
};

type ModerationStatus = "approved" | "rejected";
type ReviewStatus = "pending" | "approved" | "rejected";

const reviewStatuses: ReviewStatus[] = ["pending", "approved", "rejected"];

export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>("pending");
  const [loadedQueueKey, setLoadedQueueKey] = useState<string | null>(null);
  const [reviews, setReviews] = useState<PendingReview[]>([]);
  const [moderatingReviewId, setModeratingReviewId] = useState<number | null>(
    null
  );
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const isAdmin =
    session?.user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
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
          "id, review_text, occupancy_duration, would_live_again, created_at, properties(name, slug), property_ratings(id, category, score), landlord_ratings(id, category, score)"
        )
        .eq("status", reviewStatus)
        .order("created_at", { ascending: reviewStatus === "pending" });

      if (error) {
        throw error;
      }

      if (isActive) {
        const normalizedReviews = (data ?? []).map((review) => ({
          ...review,
          properties: Array.isArray(review.properties)
            ? review.properties[0] ?? null
            : review.properties,
        }));
        setReviews(normalizedReviews as PendingReview[]);
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

  async function moderateReview(
    reviewId: number,
    status: ModerationStatus
  ) {
    if (!isAdmin || moderatingReviewId !== null) {
      return;
    }

    setModeratingReviewId(reviewId);
    setErrorMessage("");

    const { error } = await supabase.rpc("moderate_review", {
      p_review_id: reviewId,
      p_status: status,
    });

    if (error) {
      console.error("Could not moderate review.", error.code);
      setErrorMessage("That review could not be updated. Please try again.");
    } else {
      setReviews((reviews) =>
        reviews.filter((review) => review.id !== reviewId)
      );
      setMessage(status === "approved" ? "Review approved." : "Review rejected.");
    }

    setModeratingReviewId(null);
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      setErrorMessage("Could not sign out. Please try again.");
    }
  }

  return (
    <main>
      <PageContainer>
        <div className="space-y-6">
          <BackLink fallback={{ url: "/", label: "Discover" }} />
          <div>
            <h1 className="text-2xl font-bold text-[#2F4F46]">
              Review moderation
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Pending reviews are visible only to the authorized moderator.
            </p>
          </div>

          {isCheckingSession ? (
            <p className="text-gray-600" role="status">
              Checking sign-in status...
            </p>
          ) : !session ? (
            <section className="space-y-4">
              <p className="text-gray-700">
                Sign in with the authorized admin account to review pending submissions.
              </p>
              <Link
                href="/account"
                className="inline-flex min-h-11 items-center rounded-xl bg-[#2F4F46] px-5 font-medium text-white"
              >
                Sign in or create an account
              </Link>
            </section>
          ) : !isAdmin ? (
            <section className="space-y-4">
              <p className="text-gray-700" role="alert">
                This account is not authorized to moderate reviews.
              </p>
              <button
                type="button"
                onClick={signOut}
                className="min-h-11 rounded-xl border border-[#DEDCD5] px-5 font-medium text-[#2F4F46]"
              >
                Sign out
              </button>
            </section>
          ) : (
            <section className="space-y-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-gray-600">Signed in as admin</p>
                <button
                  type="button"
                  onClick={signOut}
                  className="min-h-11 rounded-xl border border-[#DEDCD5] px-4 text-sm font-medium text-[#2F4F46]"
                >
                  Sign out
                </button>
              </div>

              <div
                className="inline-flex rounded-lg border border-[#DEDCD5] p-1"
                role="tablist"
                aria-label="Review status"
              >
                {reviewStatuses.map((status) => (
                  <button
                    key={status}
                    type="button"
                    role="tab"
                    aria-selected={reviewStatus === status}
                    onClick={() => {
                      setReviewStatus(status);
                      setMessage("");
                      setErrorMessage("");
                    }}
                    className={`min-h-10 rounded-md px-3 text-sm font-medium capitalize ${reviewStatus === status ? "bg-[#EEF5EB] text-[#2F4F46]" : "text-gray-600"}`}
                  >
                    {status}
                  </button>
                ))}
              </div>

              <h2 className="text-xl font-bold text-[#2F4F46]">
                {capitalize(reviewStatus)} reviews ({reviews.length})
              </h2>

              {isLoadingReviews ? (
                <p className="text-gray-600" role="status">
                  Loading pending reviews...
                </p>
              ) : reviews.length === 0 ? (
                <p className="text-gray-600">
                  {reviewStatus === "pending"
                    ? "The queue is clear."
                    : `No ${reviewStatus} reviews are archived yet.`}
                </p>
              ) : (
                reviews.map((review) => (
                  <article
                    key={review.id}
                    className="space-y-4 rounded-lg border border-[#DEDCD5] bg-white p-4"
                  >
                    <div>
                      <h3 className="font-bold text-[#2F4F46]">
                        {review.properties?.name ?? "Unknown property"}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Lived here {formatOccupancy(review.occupancy_duration)}
                        {" · "}
                        Would live here again: {review.would_live_again}
                      </p>
                      <p className="text-sm text-gray-500">
                        Submitted {new Date(review.created_at).toLocaleString()}
                      </p>
                    </div>

                    <p className="whitespace-pre-wrap text-gray-800">
                      {review.review_text}
                    </p>

                    <RatingList
                      title="Property ratings"
                      ratings={review.property_ratings}
                    />
                    <RatingList
                      title="Landlord ratings"
                      ratings={review.landlord_ratings}
                    />

                    {reviewStatus === "pending" ? (
                      <div className="flex flex-wrap gap-3 border-t border-[#DEDCD5] pt-4">
                        <button
                          type="button"
                          onClick={() => moderateReview(review.id, "approved")}
                          disabled={moderatingReviewId !== null}
                          className="min-h-11 rounded-xl bg-[#2F4F46] px-5 font-medium text-white disabled:opacity-60"
                        >
                          {moderatingReviewId === review.id
                            ? "Saving..."
                            : "Approve"}
                        </button>
                        <button
                          type="button"
                          onClick={() => moderateReview(review.id, "rejected")}
                          disabled={moderatingReviewId !== null}
                          className="min-h-11 rounded-xl border border-red-300 px-5 font-medium text-red-800 disabled:opacity-60"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <p className="border-t border-[#DEDCD5] pt-4 text-sm text-gray-600">
                        Archived as {reviewStatus}. This record is retained.
                      </p>
                    )}
                  </article>
                ))
              )}
            </section>
          )}

          {message && (
            <p className="text-sm text-green-800" role="status">
              {message}
            </p>
          )}
          {errorMessage && (
            <p className="text-sm text-red-700" role="alert">
              {errorMessage}
            </p>
          )}
        </div>
      </PageContainer>
    </main>
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
    <section className="space-y-2">
      <h4 className="font-semibold text-[#2F4F46]">{title}</h4>
      {ratings.length === 0 ? (
        <p className="text-sm text-gray-500">No ratings provided.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
          {ratings.map((rating) => (
            <li key={rating.id}>
              {formatCategory(rating.category)}: {rating.score.toLowerCase() === "na"
                ? "N/A"
                : rating.score}
            </li>
          ))}
        </ul>
      )}
    </section>
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

  return labels[value] ?? value.replaceAll("_", " ");
}

function formatCategory(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}