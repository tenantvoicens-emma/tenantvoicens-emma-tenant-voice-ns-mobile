"use client";

import { Turnstile } from "@marsidev/react-turnstile";
import { useEffect, useState, type FormEvent } from "react";
import {
  propertyRatingGuide,
  type RatingGuideEntry,
} from "@/lib/rating-guide";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ImagePlus, Star, X } from "lucide-react";

import { propertyLocation } from "@/lib/property-display";
import NewBuildingFields from "@/components/review/NewBuildingFields";
import ReviewSubmitted from "@/components/review/ReviewSubmitted";
import {
  ADD_BUILDING_PARAM,
  hasUnsavedWork,
  isNewBuildingComplete,
  NO_SEARCH_RESULTS_HINT,
  readDraft,
  restoreNewBuilding,
  writeDraft,
  type NewBuilding,
} from "@/lib/review-draft";
import { isSmallRentalKind } from "@/lib/rental-kind";
import { reviewIssues } from "@/lib/review-issues";
import {
  MAX_EVIDENCE_FILES,
  prepareEvidenceImage,
  type EvidenceUpload,
} from "@/lib/review-evidence";
import { OVERALL_CATEGORY } from "@/lib/ratings";
import { usePropertySearch } from "@/lib/use-property-search";
import { supabase } from "@/lib/supabase";
import {
  FLEXIBLE_TURNSTILE_STYLE,
  TURNSTILE_INCOMPLETE_MESSAGE,
} from "@/lib/turnstile";
import { PropertyListing } from "@/types/property";

type RatingCategory = RatingGuideEntry;

type SubmissionStatus = "success" | "error" | null;

const propertyRatingCategories: RatingCategory[] = propertyRatingGuide;

// A picture attached as optional evidence, with a local preview.
type EvidenceItem = EvidenceUpload & { id: number; preview: string };

const starRatings = [1, 2, 3, 4, 5] as const;
const ratingLabels: Record<number, string> = {
  1: "Poor",
  2: "Below average",
  3: "Average",
  4: "Good",
  5: "Excellent",
};

const occupancyOptions = [
  { value: "less_than_1_year", label: "Less than 1 year" },
  { value: "1_to_3_years", label: "1 to 3 years" },
  { value: "4_to_6_years", label: "4 to 6 years" },
  { value: "7_to_10_years", label: "7 to 10 years" },
  { value: "more_than_10_years", label: "More than 10 years" },
];

const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export default function SubmitReviewPage() {
  // Next keeps this page alive in the background after leaving it. Keying on
  // bfcacheId remounts the form on link navigations, so it reloads from the
  // saved draft (which fresh-start links clear), while Back keeps it as is.
  const { bfcacheId } = useRouter();
  return <ReviewForm key={bfcacheId} />;
}

function ReviewForm() {
  const [isLoadingProperties, setIsLoadingProperties] = useState(true);
  const [propertyLoadError, setPropertyLoadError] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProperty, setSelectedProperty] =
    useState<PropertyListing | null>(null);
  // Set while the renter is adding a building that isn't listed.
  const [newBuilding, setNewBuilding] = useState<NewBuilding | null>(null);
  const [occupancyDuration, setOccupancyDuration] = useState("");
  const [wouldLiveAgain, setWouldLiveAgain] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [issues, setIssues] = useState<string[]>([]);
  const [propertyRatings, setPropertyRatings] = useState<Record<string, string>>(
    {}
  );
  // Optional proof. Kept in memory only: pictures aren't saved in the draft.
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [evidenceError, setEvidenceError] = useState("");
  const [isPreparingEvidence, setIsPreparingEvidence] = useState(false);
  // Null until the renter opens or closes the detailed ratings; until then
  // they show only if a restored draft already has some.
  const [detailsOpen, setDetailsOpen] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] =
    useState<SubmissionStatus>(null);
  const [submissionError, setSubmissionError] = useState("");
  // Must be ticked to submit. Never saved in the draft: a reviewer confirms
  // each time.
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileError, setTurnstileError] = useState(false);
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  // Saving starts only after any saved draft has been restored, so the
  // empty initial form doesn't overwrite it. State rather than a ref, so it
  // turns on in the same render as the restored values: a ref flips at
  // once, and the save effect would run first with the still-empty form.
  const [isDraftReady, setIsDraftReady] = useState(false);

  useEffect(() => {
    let isActive = true;

    // Only the properties this form already knows about: the one in the
    // link it was opened from and the one in a saved draft. Everything
    // else is found by searching.
    async function loadProperties() {
      try {
        const linkParams = new URLSearchParams(window.location.search);
        const requestedSlug = linkParams.get("property");
        // Set when the link came from "Add it" on a search with no results.
        const addBuildingTerm = linkParams.get(ADD_BUILDING_PARAM);
        // A draft with nothing typed or rated (just a building picked) gives
        // way to the building in the link.
        const savedDraft = readDraft();
        const draft =
          (requestedSlug || addBuildingTerm !== null) &&
          !hasUnsavedWork(savedDraft)
            ? null
            : savedDraft;
        const slugs = [requestedSlug, draft?.propertySlug].filter(
          (slug): slug is string => Boolean(slug)
        );

        let propertyListings: PropertyListing[] = [];
        if (slugs.length > 0) {
          const { data, error } = await supabase
            .from("properties")
            .select("id, slug, name, address, city, is_small_rental")
            .in("slug", slugs);

          if (error) {
            throw error;
          }
          propertyListings = (data ?? []).map(
            ({ is_small_rental, ...property }) => ({
              ...property,
              address: property.address ?? "",
              city: property.city ?? "",
              isSmallRental: is_small_rental === true,
            })
          );
        }

        if (isActive) {
          const requestedProperty = propertyListings.find(
            (property) => property.slug === requestedSlug
          );

          if (draft) {
            setSearchTerm(draft.searchTerm);
            setSelectedProperty(
              propertyListings.find(
                (property) => property.slug === draft.propertySlug
              ) ?? null
            );
            setNewBuilding(restoreNewBuilding(draft.newBuilding));
            setOccupancyDuration(draft.occupancyDuration);
            setWouldLiveAgain(draft.wouldLiveAgain);
            setReviewText(draft.reviewText);
            setIssues(draft.issues ?? []);
            setPropertyRatings(draft.propertyRatings);
          } else if (requestedProperty) {
            setSelectedProperty(requestedProperty);
            setSearchTerm(requestedProperty.name);
          } else if (addBuildingTerm !== null) {
            setSearchTerm(addBuildingTerm);
            setNewBuilding(newBuildingFromSearch(addBuildingTerm));
          }
          setIsDraftReady(true);
        }
      } catch (error) {
        console.error("Failed to load properties for the review form.", error);
        if (isActive) {
          setPropertyLoadError(true);
        }
      } finally {
        if (isActive) {
          setIsLoadingProperties(false);
        }
      }
    }

    void loadProperties();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!isDraftReady || submissionStatus === "success") {
      return;
    }
    writeDraft({
      propertySlug: selectedProperty?.slug ?? null,
      newBuilding,
      searchTerm,
      occupancyDuration,
      wouldLiveAgain,
      reviewText,
      issues,
      propertyRatings,
    });
  }, [
    selectedProperty,
    newBuilding,
    searchTerm,
    occupancyDuration,
    wouldLiveAgain,
    reviewText,
    issues,
    propertyRatings,
    submissionStatus,
    isDraftReady,
  ]);

  // Search results don't say whether a property is a small rental, so look
  // it up once one is picked.
  const selectedId = selectedProperty?.id;
  const selectedKindKnown = selectedProperty?.isSmallRental !== undefined;
  useEffect(() => {
    if (selectedId === undefined || selectedKindKnown) {
      return;
    }
    let isActive = true;
    void supabase
      .from("properties")
      .select("is_small_rental")
      .eq("id", selectedId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error("Could not check the property's rental type.", error.code);
          return;
        }
        if (isActive) {
          setSelectedProperty((current) =>
            current?.id === selectedId
              ? { ...current, isSmallRental: data?.is_small_rental === true }
              : current
          );
        }
      });
    return () => {
      isActive = false;
    };
  }, [selectedId, selectedKindKnown]);

  const search = usePropertySearch(
    selectedProperty || newBuilding ? "" : searchTerm,
    10
  );
  const hasBuilding = Boolean(selectedProperty) || isNewBuildingComplete(newBuilding);
  const isSmallRental = selectedProperty
    ? selectedProperty.isSmallRental === true
    : isSmallRentalKind(newBuilding?.rentalKind);
  const showSuggestions =
    search.status !== "idle" && !isLoadingProperties && !propertyLoadError;
  const hasDetailedRatings = Object.entries(propertyRatings).some(
    ([category, value]) => category !== OVERALL_CATEGORY && value !== ""
  );
  // A review needs something to say: some text, a ticked problem or a rating.
  const hasContent =
    reviewText.trim() !== "" ||
    issues.length > 0 ||
    Object.values(propertyRatings).some((value) => value !== "" && value !== "na");
  const showDetails = detailsOpen ?? hasDetailedRatings;
  const buildingLabel = selectedProperty
    ? selectedProperty.name
    : newBuilding
      ? [newBuilding.name.trim(), newBuilding.address.trim(), newBuilding.city.trim()]
          .filter(Boolean)
          .join(", ")
      : "";

  function startNewBuilding() {
    setNewBuilding(newBuildingFromSearch(searchTerm));
    setSelectedProperty(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasBuilding) {
      setSubmissionStatus("error");
      setSubmissionError(
        "Choose your building from the search results, or finish adding it, before you submit."
      );
      return;
    }
    if (!hasContent) {
      setSubmissionStatus("error");
      setSubmissionError(
        "Add a rating, tick a problem, or write a few words about the property before you submit."
      );
      return;
    }
    if (!acceptedTerms) {
      setSubmissionStatus("error");
      setSubmissionError(
        "Please confirm that this is your own, honest experience of the property before you submit."
      );
      return;
    }
    if (!turnstileToken) {
      setSubmissionStatus("error");
      setSubmissionError(
        TURNSTILE_INCOMPLETE_MESSAGE
      );
      return;
    }
    void submitReview();
  }

  function updateRating(category: string, value: string) {
    setPropertyRatings((currentRatings) => ({
      ...currentRatings,
      [category]: value,
    }));
  }

  function toggleIssue(issue: string) {
    setIssues((current) =>
      current.includes(issue)
        ? current.filter((value) => value !== issue)
        : [...current, issue]
    );
  }

  async function addEvidence(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }
    setEvidenceError("");
    setIsPreparingEvidence(true);
    try {
      const room = MAX_EVIDENCE_FILES - evidence.length;
      const chosen = Array.from(files).slice(0, Math.max(room, 0));
      if (files.length > chosen.length) {
        setEvidenceError(`You can attach up to ${MAX_EVIDENCE_FILES} pictures.`);
      }
      const prepared: EvidenceItem[] = [];
      for (const file of chosen) {
        try {
          const upload = await prepareEvidenceImage(file);
          prepared.push({
            ...upload,
            id: Date.now() + prepared.length + Math.random(),
            preview: `data:${upload.mimeType};base64,${upload.data}`,
          });
        } catch (error) {
          setEvidenceError(
            error instanceof Error ? error.message : "We couldn’t attach that picture."
          );
        }
      }
      if (prepared.length > 0) {
        setEvidence((current) =>
          [...current, ...prepared].slice(0, MAX_EVIDENCE_FILES)
        );
      }
    } finally {
      setIsPreparingEvidence(false);
    }
  }

  function removeEvidence(id: number) {
    setEvidence((current) => current.filter((item) => item.id !== id));
    setEvidenceError("");
  }

  async function submitReview() {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSubmissionStatus(null);
    setSubmissionError("");

    const toRatingRows = (ratings: Record<string, string>) =>
      Object.entries(ratings)
        .filter(([, score]) => score !== "")
        .map(([category, score]) => ({ category, score }));

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (sessionData.session?.access_token) {
        headers.Authorization = `Bearer ${sessionData.session.access_token}`;
      }

      const response = await fetch("/api/reviews", {
        method: "POST",
        headers,
        body: JSON.stringify({
          turnstileToken,
          ...(selectedProperty
            ? { propertyId: selectedProperty.id }
            : {
                newProperty: {
                  address: newBuilding?.address.trim(),
                  city: newBuilding?.city.trim(),
                  name: newBuilding?.name.trim() || undefined,
                  rentalKind: newBuilding?.rentalKind,
                },
              }),
          reviewText,
          occupancyDuration,
          wouldLiveAgain,
          acceptedTerms,
          issues,
          propertyRatings: toRatingRows(propertyRatings),
          ...(evidence.length > 0
            ? {
                evidence: evidence.map(({ mimeType, data }) => ({
                  mimeType,
                  data,
                })),
              }
            : {}),
        }),
      });

      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        setSubmissionStatus("error");
        setSubmissionError(
          result.error ?? "We couldn’t submit your review. Please try again."
        );
        setTurnstileToken("");
        setTurnstileResetKey((key) => key + 1);
        return;
      }

      setSubmissionStatus("success");
      setEvidence([]);
      setAcceptedTerms(false);
      writeDraft(null);
    } catch {
      setSubmissionStatus("error");
      setSubmissionError("We couldn’t reach the review service. Please try again.");
      setTurnstileToken("");
      setTurnstileResetKey((key) => key + 1);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md px-5 py-6 md:max-w-none lg:max-w-2xl">
      <div className="space-y-6">
        <h1 className="text-4xl font-bold leading-tight tracking-tight text-[#294B3A]">
          Your experience matters
        </h1>

        {submissionStatus !== "success" && (
          <>
          <p className="text-lg text-[#66706B]">
            A guided review helps other renters understand what day-to-day life
            can be like.
          </p>

          <p className="text-sm text-[#66706B]">
            You can submit anonymously. If you sign in, your review can be privately
            linked to your account for future account features; your identity is
            never shown publicly. <Link className="font-medium text-[#2F4F46] underline" href="/account">Sign in or create an account</Link>.
          </p>
          </>
        )}

        {submissionStatus === "success" ? (
          <ReviewSubmitted
            buildingName={
              selectedProperty?.name ??
              (newBuilding?.name.trim() || newBuilding?.address.trim() || "your building")
            }
            propertySlug={selectedProperty?.slug ?? null}
          />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            <section className={formCard} aria-labelledby="property-heading">
              <h2 id="property-heading" className="text-xl font-bold text-[#294B3A]">
                Property
              </h2>
              <div className="space-y-2">
                {newBuilding ? (
                  <NewBuildingFields
                    building={newBuilding}
                    onChange={(building) => {
                      setNewBuilding(building);
                    }}
                    onCancel={() => {
                      setNewBuilding(null);
                    }}
                    fieldClassName={formField}
                  />
                ) : (
                  <>
                <label htmlFor="property-search" className="block text-lg font-medium text-[#4A5A52]">
                  Find the property you lived in
                </label>
                <input
                  id="property-search"
                  type="search"
                  required
                  autoComplete="off"
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                    setSelectedProperty(null);
                  }}
                  placeholder="Search by property name, address, or city"
                  aria-autocomplete="list"
                  // Only while the suggestions list is on the page.
                  aria-controls={showSuggestions ? "property-suggestions" : undefined}
                  className={formField}
                />

                {isLoadingProperties && (
                  <p className="text-sm text-gray-500" role="status">
                    Loading properties...
                  </p>
                )}

                {propertyLoadError && (
                  <p className="text-sm text-red-700" role="alert">
                    Properties could not be loaded. Please try again later.
                  </p>
                )}

                {showSuggestions && (
                    <ul
                      id="property-suggestions"
                      className="overflow-hidden rounded-2xl border border-[#E6E3DA] bg-white"
                    >
                      {search.results.length > 0 ? (
                        search.results.map((property) => (
                          <li key={property.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedProperty(property);
                                setSearchTerm(property.name);
                              }}
                              className="block w-full border-b border-[#DEDCD5] p-3 text-left last:border-b-0 hover:bg-[#EEF5EB]"
                            >
                              <span className="block font-medium">
                                {property.name}
                              </span>
                              <span className="block text-sm text-gray-500">
                                {propertyLocation(property, ", ")}
                              </span>
                            </button>
                          </li>
                        ))
                      ) : search.status === "loading" ? (
                        <li className="p-3 text-sm text-gray-600" role="status">
                          Searching...
                        </li>
                      ) : search.status === "error" ? (
                        <li className="space-y-2 p-3 text-sm text-red-700" role="alert">
                          <p>Search isn&apos;t working right now. Please try again in a moment.</p>
                          <button
                            type="button"
                            onClick={search.retry}
                            className="font-medium text-[#2F4F46] underline decoration-[#2F4F46]/30 underline-offset-4"
                          >
                            Try again
                          </button>
                        </li>
                      ) : (
                        <li className="space-y-2 p-3 text-sm text-gray-600">
                          <p>
                            No properties match that search. {NO_SEARCH_RESULTS_HINT}
                          </p>
                          <button
                            type="button"
                            onClick={startNewBuilding}
                            className="font-medium text-[#2F4F46] underline decoration-[#2F4F46]/30 underline-offset-4"
                          >
                            My building isn&apos;t listed
                          </button>
                        </li>
                      )}
                    </ul>
                  )}

                    {!selectedProperty && (
                      <button
                        type="button"
                        onClick={startNewBuilding}
                        className="text-sm font-medium text-[#2F4F46] underline decoration-[#2F4F46]/30 underline-offset-4"
                      >
                        Can&apos;t find your building? Add it.
                      </button>
                    )}
                  </>
                )}

                {selectedProperty && (
                  <p className="text-sm text-green-700" role="status">
                    Selected: {selectedProperty.name}
                  </p>
                )}
              </div>
              {isSmallRental && <SmallRentalNotice />}
            </section>

            <section className={formCard} aria-labelledby="experience-heading">
              <h2 id="experience-heading" className="text-xl font-bold text-[#294B3A]">
                Your experience
              </h2>

              <div className="space-y-2">
                <label htmlFor="occupancy-duration" className="block text-lg font-medium text-[#4A5A52]">
                  How long did you live there?
                </label>
                <select
                  id="occupancy-duration"
                  required
                  value={occupancyDuration}
                  onChange={(event) => setOccupancyDuration(event.target.value)}
                  className={formField}
                >
                  <option value="">Choose a time range</option>
                  {occupancyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="would-live-again" className="block text-lg font-medium text-[#4A5A52]">
                  Would you live there again?
                </label>
                <select
                  id="would-live-again"
                  required
                  value={wouldLiveAgain}
                  onChange={(event) => setWouldLiveAgain(event.target.value)}
                  className={formField}
                >
                  <option value="">Choose an answer</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                  <option value="unsure">Unsure</option>
                </select>
              </div>

              <p id="overall-scale" className="text-[#66706B]">
                1 is poor and 5 is excellent. Choose N/A if it doesn&apos;t apply,
                or skip it.
              </p>
              <StarRatingField
                name="property-overall"
                label="Overall, how would you rate the property?"
                value={propertyRatings[OVERALL_CATEGORY] ?? ""}
                onChange={(value) => updateRating(OVERALL_CATEGORY, value)}
                describedBy="overall-scale"
                emphasis
              />

              <fieldset className="space-y-2">
                <legend className="block text-lg font-medium text-[#4A5A52]">
                  Did you have any of these problems at the property?{" "}
                  <span className="font-normal text-[#66706B]">(optional)</span>
                </legend>
                <p className="text-[#66706B]">
                  Tick everything that applies during the time you lived there.
                </p>
                <div className="space-y-1">
                  {reviewIssues.map((issue) => (
                    <label
                      key={issue.value}
                      className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-1 text-[#1F2A24]"
                    >
                      <input
                        type="checkbox"
                        checked={issues.includes(issue.value)}
                        onChange={() => toggleIssue(issue.value)}
                        className="h-5 w-5 shrink-0 accent-[#08873A]"
                      />
                      <span>{issue.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="space-y-2">
                <label htmlFor="review-text" className="block text-lg font-medium text-[#4A5A52]">
                  Anything else other renters should know about the property?{" "}
                  <span className="font-normal text-[#66706B]">(optional)</span>
                </label>
                <div id="review-text-tips" className="space-y-2 text-[#66706B]">
                  <p>
                    Describe the property and what you saw: its condition,
                    repairs and maintenance, heat and hot water, noise, pests
                    and safety.
                  </p>
                  <p className="font-medium text-[#4A5A52]">
                    This site reviews places, not people. Don&apos;t name or
                    describe your landlord, a property manager, staff, other
                    tenants or anyone else, and don&apos;t include unit numbers
                    or other personal details. Stick to what happened at the
                    property. We can&apos;t publish reviews that name people,
                    and we can&apos;t contact you to ask for changes.
                  </p>
                  <p>
                    For example: &ldquo;The heat didn&apos;t work for most of
                    January, and the repair took about three weeks.&rdquo;
                  </p>
                </div>
                <textarea
                  id="review-text"
                  value={reviewText}
                  onChange={(event) => setReviewText(event.target.value)}
                  aria-describedby="review-text-tips"
                  placeholder="What was it like living there?"
                  rows={6}
                  className={formField}
                />
              </div>
            </section>

            <section className={formCard} aria-labelledby="details-heading">
              <h2 id="details-heading" className="text-xl font-bold text-[#294B3A]">
                Detailed ratings{" "}
                <span className="font-normal text-[#66706B]">(optional)</span>
              </h2>
              <p className="text-[#4A5A52]">
                Rate things like cleanliness, safety, noise and building
                condition. It takes about a minute and helps other renters
                compare properties.
              </p>
              <button
                type="button"
                aria-expanded={showDetails}
                aria-controls="detailed-ratings"
                onClick={() => setDetailsOpen(!showDetails)}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-[#2F4F46] py-3 text-lg font-medium text-[#2F4F46]"
              >
                {showDetails ? "Hide detailed ratings" : "Add detailed ratings"}
                <ChevronDown
                  className={`h-5 w-5 ${showDetails ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>
            </section>

            <div id="detailed-ratings" hidden={!showDetails} className="space-y-8">
              <RatingGroup
                title="Property ratings"
                description="Rate the building and shared spaces. Choose N/A if a category doesn’t apply or you’re not sure, or just skip it."
                categories={propertyRatingCategories}
                values={propertyRatings}
                onChange={updateRating}
                idPrefix="property-rating"
              />
            </div>

            <section className={formCard} aria-labelledby="evidence-heading">
              <h2 id="evidence-heading" className="text-xl font-bold text-[#294B3A]">
                Add proof{" "}
                <span className="font-normal text-[#66706B]">(optional)</span>
              </h2>
              <p className="text-[#4A5A52]">
                You can attach up to {MAX_EVIDENCE_FILES} photos or screenshots,
                such as a picture of the problem. Proof is never shown
                publicly. Only the moderator can see it, to check a review if
                it&apos;s challenged, and it&apos;s deleted along with the
                review.
              </p>
              <p className="text-sm text-[#66706B]">
                Cover or crop out names, faces, phone numbers and unit numbers
                first. Pictures are resized here in your browser, which also
                removes location and camera details.
              </p>
              {evidence.length > 0 && (
                <ul className="grid grid-cols-3 gap-3">
                  {evidence.map((item, index) => (
                    <li key={item.id} className="relative">
                      {/* A local preview of the picture being attached. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.preview}
                        alt={`Attached picture ${index + 1}`}
                        className="aspect-square w-full rounded-2xl border border-[#E6E3DA] object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeEvidence(item.id)}
                        aria-label={`Remove attached picture ${index + 1}`}
                        className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#294B3A] shadow"
                      >
                        <X className="h-5 w-5" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {evidence.length < MAX_EVIDENCE_FILES && (
                <label className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-[#2F4F46] py-3 text-lg font-medium text-[#2F4F46]">
                  <ImagePlus className="h-5 w-5" aria-hidden="true" />
                  {isPreparingEvidence ? "Preparing picture…" : "Attach a picture"}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={isPreparingEvidence}
                    onChange={(event) => {
                      void addEvidence(event.target.files);
                      event.target.value = "";
                    }}
                    className="sr-only"
                  />
                </label>
              )}
              {evidenceError && (
                <p className="text-red-700" role="alert">
                  {evidenceError}
                </p>
              )}
            </section>

            <section className={formCard} aria-labelledby="submit-heading">
              <h2 id="submit-heading" className="text-xl font-bold text-[#294B3A]">
                Ready to submit?
              </h2>

              <dl className="space-y-2 text-[#4A5A52]">
                <SummaryRow label="Building" value={buildingLabel || "Not chosen yet"} />
                <SummaryRow
                  label="Time lived there"
                  value={getOptionLabel(occupancyOptions, occupancyDuration)}
                />
                <SummaryRow
                  label="Would live there again"
                  value={getWouldLiveAgainLabel(wouldLiveAgain)}
                />
                <SummaryRow
                  label="Property overall"
                  value={overallLabel(propertyRatings[OVERALL_CATEGORY])}
                />
                <SummaryRow
                  label="Problems ticked"
                  value={issues.length === 0 ? "None" : String(issues.length)}
                />
                <SummaryRow
                  label="Detailed ratings"
                  value={detailedLabel(propertyRatings)}
                />
                <SummaryRow
                  label="Pictures attached"
                  value={evidence.length === 0 ? "None" : String(evidence.length)}
                />
              </dl>

              <ul className="list-disc space-y-1 pl-5 text-[#4A5A52]">
                <li>Your name is never shown publicly, even if you&apos;re signed in.</li>
                <li>We check every review before it goes up, usually within a day.</li>
                {newBuilding && (
                  <li>We&apos;ll also check the building you added before it appears.</li>
                )}
              </ul>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#E6E3DA] p-4 text-[#1F2A24] has-[:checked]:border-[#08873A] has-[:checked]:bg-[#F1F7EF]">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(event) => setAcceptedTerms(event.target.checked)}
                  className="mt-1 h-5 w-5 shrink-0 accent-[#08873A]"
                />
                <span>
                  I lived at this property, and this review describes my own
                  experience of it. It&apos;s true to the best of my
                  knowledge, and it doesn&apos;t name or describe anyone. I
                  agree to the{" "}
                  <Link href="/terms" target="_blank" className="font-medium text-[#2F4F46] underline">
                    Terms of Service
                  </Link>{" "}
                  and the{" "}
                  <Link href="/policies#review-guidelines" target="_blank" className="font-medium text-[#2F4F46] underline">
                    review guidelines
                  </Link>
                  .
                </span>
              </label>

              {turnstileSiteKey ? (
                <Turnstile
                  key={turnstileResetKey}
                  siteKey={turnstileSiteKey}
                  options={{ action: "review_submit", theme: "light", size: "flexible" }}
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
                  Review submission security is not configured yet.
                </p>
              )}

              {turnstileError && (
                <p className="text-red-700" role="alert">
                  The security check failed to load. Please refresh and try again.
                </p>
              )}

              {submissionStatus === "error" && (
                <p className="text-red-700" role="alert">
                  {submissionError || "We couldn’t submit your review. Please try again."}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !turnstileSiteKey}
                className="w-full rounded-full bg-[#08873A] py-4 text-lg font-medium text-white disabled:cursor-wait disabled:opacity-60"
              >
                {isSubmitting ? "Submitting..." : "Submit review"}
              </button>
            </section>
          </form>
        )}
      </div>
    </div>
  );
}

const formCard = "space-y-4 rounded-3xl border border-[#E6E3DA] bg-white p-6";
const formField =
  "w-full rounded-2xl border border-[#D9D6CE] bg-white p-4 text-lg focus:border-[#08873A]";

type RatingGroupProps = {
  title: string;
  description: string;
  categories: RatingCategory[];
  values: Record<string, string>;
  onChange: (category: string, value: string) => void;
  idPrefix: string;
};

function RatingGroup({
  title,
  description,
  categories,
  values,
  onChange,
  idPrefix,
}: RatingGroupProps) {
  return (
    <fieldset className={formCard}>
      <legend className="float-left w-full text-xl font-bold text-[#294B3A]">{title}</legend>
      <p id={`${idPrefix}-scale`} className="clear-both text-sm text-[#66706B]">
        {description} 5 is always the best for a renter, so 5 for noise
        means quiet.
      </p>

      <div className="space-y-3">
        {categories.map((category) => (
          <StarRatingField
            key={category.value}
            name={`${idPrefix}-${category.value}`}
            label={category.label}
            hint={`5: ${category.high} · 1: ${category.low}`}
            value={values[category.value] ?? ""}
            onChange={(value) => onChange(category.value, value)}
            describedBy={`${idPrefix}-scale`}
          />
        ))}
      </div>
    </fieldset>
  );
}

type StarRatingFieldProps = {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  describedBy: string;
  // What a 5 and a 1 mean for this category.
  hint?: string;
  emphasis?: boolean;
};

// Five stars plus N/A, as one radio group. N/A also undoes a star tapped by
// mistake.
function StarRatingField({
  name,
  label,
  value,
  onChange,
  describedBy,
  hint,
  emphasis = false,
}: StarRatingFieldProps) {
  const selectedScore = Number(value) || 0;
  const hintId = `${name}-hint`;
  const descriptions = hint ? `${hintId} ${describedBy}` : describedBy;

  return (
    <fieldset className="space-y-2">
      <legend
        className={
          emphasis
            ? "text-lg font-semibold text-[#294B3A]"
            : "text-lg font-medium text-[#4A5A52]"
        }
      >
        {label}
      </legend>
      {hint && (
        <p id={hintId} className="text-sm text-[#66706B]">
          {hint}
        </p>
      )}
      <div className="grid grid-cols-5 gap-2">
        {starRatings.map((score) => (
          <label
            key={score}
            title={`${score} - ${ratingLabels[score]}`}
            className="block cursor-pointer"
          >
            <input
              type="radio"
              name={name}
              value={score}
              checked={value === String(score)}
              aria-describedby={descriptions}
              onChange={() => onChange(String(score))}
              className="peer sr-only"
            />
            <span
              aria-hidden="true"
              className={`flex flex-col items-center gap-1 rounded-2xl py-3 text-lg peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#2F4F46] ${score <= selectedScore ? "bg-[#DDEBD8] text-[#2F4F46]" : "bg-[#F3F3E9] text-[#8A938E]"}`}
            >
              <Star
                className="h-6 w-6"
                fill={score <= selectedScore ? "currentColor" : "none"}
              />
              {score}
            </span>
            <span className="sr-only">
              {score} out of 5, {ratingLabels[score]}
            </span>
          </label>
        ))}
      </div>
      <label className="inline-block cursor-pointer">
        <input
          type="radio"
          name={name}
          value="na"
          checked={value === "na"}
          aria-describedby={descriptions}
          onChange={() => onChange("na")}
          className="peer sr-only"
        />
        <span className="inline-flex min-h-11 items-center rounded-full border border-[#D9D6CE] px-4 text-sm peer-checked:border-[#2F4F46] peer-checked:bg-[#DDEBD8] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#2F4F46]">
          N/A
        </span>
      </label>
    </fieldset>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="sm:flex sm:gap-2">
      <dt className="font-medium">{label}:</dt>
      <dd>{value}</dd>
    </div>
  );
}

function overallLabel(value: string | undefined) {
  if (value === "na") {
    return "N/A";
  }
  return value ? `${value} out of 5` : "Skipped";
}

function detailedLabel(propertyValues: Record<string, string>) {
  const total = propertyRatingCategories.length;
  const count = propertyRatingCategories.filter(
    (category) => propertyValues[category.value]
  ).length;
  return count === 0 ? "None (optional)" : `${count} of ${total} answered`;
}

function getOptionLabel(options: RatingCategory[] | typeof occupancyOptions, value: string) {
  return options.find((option) => option.value === value)?.label ?? "Not selected";
}

function getWouldLiveAgainLabel(value: string) {
  const labels: Record<string, string> = {
    yes: "Yes",
    no: "No",
    unsure: "Unsure",
  };

  return labels[value] ?? "Not selected";
}

// The add-a-building fields, starting from what the renter searched for:
// kept as the address if it looks like a street address.
function newBuildingFromSearch(searchTerm: string): NewBuilding {
  const typed = searchTerm.trim();
  return {
    address: /^\d/.test(typed) ? typed : "",
    city: "",
    name: "",
    rentalKind: "",
  };
}

// For houses, suites, rooms, duplexes and condos. Reviewing one is the
// writer's choice; this explains the risk and what the site does about it.
function SmallRentalNotice() {
  return (
    <div className="space-y-2 rounded-2xl border border-[#E8D9B5] bg-[#FBF5E6] p-4 text-[#4A4030]">
      <p className="font-medium">This is a private rental</p>
      <p>
        With only a few tenants, your landlord may be able to tell who wrote
        a review. If you still live there, you may want to wait until
        you&apos;ve moved out. It&apos;s your choice.
      </p>
      <p>
        To help, we show only the year your review was written, and never a
        unit number. Leave out anything that could identify you, your
        roommates or anyone else, including your landlord.
      </p>
    </div>
  );
}
