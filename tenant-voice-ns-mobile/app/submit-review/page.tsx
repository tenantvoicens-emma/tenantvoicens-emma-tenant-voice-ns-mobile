"use client";

import { Turnstile } from "@marsidev/react-turnstile";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Star } from "lucide-react";

import BackLink from "@/components/navigation/BackLink";
import { propertyLocation } from "@/lib/property-display";
import NewBuildingFields from "@/components/review/NewBuildingFields";
import ReviewSubmitted from "@/components/review/ReviewSubmitted";
import {
  hasUnsavedWork,
  isNewBuildingComplete,
  readDraft,
  writeDraft,
  type NewBuilding,
} from "@/lib/review-draft";
import { OVERALL_CATEGORY } from "@/lib/ratings";
import { usePropertySearch } from "@/lib/use-property-search";
import { supabase } from "@/lib/supabase";
import { PropertyListing } from "@/types/property";

type RatingCategory = {
  value: string;
  label: string;
};

type SubmissionStatus = "success" | "error" | null;

const propertyRatingCategories: RatingCategory[] = [
  { value: "cleanliness", label: "Cleanliness" },
  { value: "safety", label: "Safety" },
  { value: "common_areas", label: "Common areas" },
  { value: "noise_levels", label: "Noise levels" },
  { value: "parking", label: "Parking" },
  { value: "amenities", label: "Amenities" },
  { value: "building_condition", label: "Building condition" },
  { value: "pet_friendliness", label: "Pet friendliness" },
];

const landlordRatingCategories: RatingCategory[] = [
  { value: "communication", label: "Communication" },
  { value: "repair_speed", label: "Repair speed" },
  { value: "professionalism", label: "Professionalism" },
  { value: "lease_transparency", label: "Lease transparency" },
  { value: "move_in_experience", label: "Move-in experience" },
];

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
  const [propertyRatings, setPropertyRatings] = useState<Record<string, string>>(
    {}
  );
  const [landlordRatings, setLandlordRatings] = useState<Record<string, string>>(
    {}
  );
  // Null until the renter opens or closes the detailed ratings; until then
  // they show only if a restored draft already has some.
  const [detailsOpen, setDetailsOpen] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] =
    useState<SubmissionStatus>(null);
  const [submissionError, setSubmissionError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileError, setTurnstileError] = useState(false);
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  // The profile this form was opened from, for the back link when this
  // tab has no earlier page.
  const [profileProperty, setProfileProperty] =
    useState<PropertyListing | null>(null);
  // Saving starts only after any saved draft has been restored, so the
  // empty initial form doesn't overwrite it.
  const isDraftReady = useRef(false);

  useEffect(() => {
    let isActive = true;

    // Only the properties this form already knows about: the one in the
    // link it was opened from and the one in a saved draft. Everything
    // else is found by searching.
    async function loadProperties() {
      try {
        const requestedSlug = new URLSearchParams(window.location.search).get(
          "property"
        );
        // A draft with nothing typed or rated (just a building picked) gives
        // way to the building in the link.
        const savedDraft = readDraft();
        const draft =
          requestedSlug && !hasUnsavedWork(savedDraft) ? null : savedDraft;
        const slugs = [requestedSlug, draft?.propertySlug].filter(
          (slug): slug is string => Boolean(slug)
        );

        let propertyListings: PropertyListing[] = [];
        if (slugs.length > 0) {
          const { data, error } = await supabase
            .from("properties")
            .select("id, slug, name, address, city")
            .in("slug", slugs);

          if (error) {
            throw error;
          }
          propertyListings = (data ?? []).map((property) => ({
            ...property,
            address: property.address ?? "",
            city: property.city ?? "",
          }));
        }

        if (isActive) {
          const requestedProperty = propertyListings.find(
            (property) => property.slug === requestedSlug
          );

          if (requestedProperty) {
            setProfileProperty(requestedProperty);
          }

          if (draft) {
            setSearchTerm(draft.searchTerm);
            setSelectedProperty(
              propertyListings.find(
                (property) => property.slug === draft.propertySlug
              ) ?? null
            );
            setNewBuilding(draft.newBuilding ?? null);
            setOccupancyDuration(draft.occupancyDuration);
            setWouldLiveAgain(draft.wouldLiveAgain);
            setReviewText(draft.reviewText);
            setPropertyRatings(draft.propertyRatings);
            setLandlordRatings(draft.landlordRatings);
          } else if (requestedProperty) {
            setSelectedProperty(requestedProperty);
            setSearchTerm(requestedProperty.name);
          }
          isDraftReady.current = true;
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
    if (!isDraftReady.current || submissionStatus === "success") {
      return;
    }
    writeDraft({
      propertySlug: selectedProperty?.slug ?? null,
      newBuilding,
      searchTerm,
      occupancyDuration,
      wouldLiveAgain,
      reviewText,
      propertyRatings,
      landlordRatings,
    });
  }, [
    selectedProperty,
    newBuilding,
    searchTerm,
    occupancyDuration,
    wouldLiveAgain,
    reviewText,
    propertyRatings,
    landlordRatings,
    submissionStatus,
  ]);

  const search = usePropertySearch(
    selectedProperty || newBuilding ? "" : searchTerm,
    10
  );
  const hasBuilding = Boolean(selectedProperty) || isNewBuildingComplete(newBuilding);
  const hasDetailedRatings = [...Object.entries(propertyRatings), ...Object.entries(landlordRatings)]
    .some(([category, value]) => category !== OVERALL_CATEGORY && value !== "");
  const showDetails = detailsOpen ?? hasDetailedRatings;
  const buildingLabel = selectedProperty
    ? selectedProperty.name
    : newBuilding
      ? [newBuilding.name.trim(), newBuilding.address.trim(), newBuilding.city.trim()]
          .filter(Boolean)
          .join(", ")
      : "";

  function startNewBuilding() {
    const typed = searchTerm.trim();
    setNewBuilding({
      // Keep what they searched for if it looks like a street address.
      address: /^\d/.test(typed) ? typed : "",
      city: "",
      name: "",
      hasFourOrMoreUnits: false,
    });
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
    if (!turnstileToken) {
      setSubmissionStatus("error");
      setSubmissionError(
        "The security check above isn’t finished yet. Please wait a moment, then press Submit again."
      );
      return;
    }
    void submitReview();
  }

  function updateRating(
    group: "property" | "landlord",
    category: string,
    value: string
  ) {
    const setRatings = group === "property" ? setPropertyRatings : setLandlordRatings;
    setRatings((currentRatings) => ({
      ...currentRatings,
      [category]: value,
    }));
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
                  hasFourOrMoreUnits: true,
                },
              }),
          reviewText,
          occupancyDuration,
          wouldLiveAgain,
          propertyRatings: toRatingRows(propertyRatings),
          landlordRatings: toRatingRows(landlordRatings),
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
    <main className="mx-auto w-full max-w-md px-5 py-6 md:max-w-none lg:max-w-2xl">
      <div className="space-y-6">
        <BackLink
          fallback={
            profileProperty
              ? {
                  url: `/properties/${encodeURIComponent(profileProperty.slug)}`,
                  label: profileProperty.name,
                }
              : undefined
          }
        />

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
                  aria-controls="property-suggestions"
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

                {search.status !== "idle" &&
                  !isLoadingProperties &&
                  !propertyLoadError && (
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
                        <li className="p-3 text-sm text-red-700" role="alert">
                          Search isn&apos;t working right now. Please try again in a moment.
                        </li>
                      ) : (
                        <li className="space-y-2 p-3 text-sm text-gray-600">
                          <p>
                            No matching property. Try just the street name, or the
                            street number and name.
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
                        Can&apos;t find your building? Add it
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
                label="Overall, how would you rate the building?"
                value={propertyRatings[OVERALL_CATEGORY] ?? ""}
                onChange={(value) => updateRating("property", OVERALL_CATEGORY, value)}
                describedBy="overall-scale"
                emphasis
              />
              <StarRatingField
                name="landlord-overall"
                label="Overall, how would you rate the landlord or property manager?"
                value={landlordRatings[OVERALL_CATEGORY] ?? ""}
                onChange={(value) => updateRating("landlord", OVERALL_CATEGORY, value)}
                describedBy="overall-scale"
                emphasis
              />

              <div className="space-y-2">
                <label htmlFor="review-text" className="block text-lg font-medium text-[#4A5A52]">
                  What would you like other renters to know?
                </label>
                <div id="review-text-tips" className="space-y-2 text-[#66706B]">
                  <p>
                    You might mention repairs and maintenance, heat and hot water,
                    noise, pests, safety, and how management handled problems.
                  </p>
                  <p className="font-medium text-[#4A5A52]">
                    Please don&apos;t include anyone&apos;s name, unit numbers or
                    other personal details. We can&apos;t publish reviews that do.
                  </p>
                </div>
                <textarea
                  id="review-text"
                  required
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
                Rate things like cleanliness, safety, repair speed and
                communication. It takes about a minute and helps other renters
                compare buildings.
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
                onChange={(category, value) =>
                  updateRating("property", category, value)
                }
                idPrefix="property-rating"
              />

              <RatingGroup
                title="Landlord ratings"
                description="Rate the property manager or landlord. Choose N/A if a category doesn’t apply or you’re not sure, or just skip it."
                categories={landlordRatingCategories}
                values={landlordRatings}
                onChange={(category, value) =>
                  updateRating("landlord", category, value)
                }
                idPrefix="landlord-rating"
              />
            </div>

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
                  label="Building overall"
                  value={overallLabel(propertyRatings[OVERALL_CATEGORY])}
                />
                <SummaryRow
                  label="Landlord overall"
                  value={overallLabel(landlordRatings[OVERALL_CATEGORY])}
                />
                <SummaryRow
                  label="Detailed ratings"
                  value={detailedLabel(propertyRatings, landlordRatings)}
                />
              </dl>

              <ul className="list-disc space-y-1 pl-5 text-[#4A5A52]">
                <li>Your name is never shown publicly, even if you&apos;re signed in.</li>
                <li>We check every review before it goes up, usually within a day.</li>
                {newBuilding && (
                  <li>We&apos;ll also check the building you added before it appears.</li>
                )}
              </ul>

              {turnstileSiteKey ? (
                <Turnstile
                  key={turnstileResetKey}
                  siteKey={turnstileSiteKey}
                  options={{ action: "review_submit", theme: "light" }}
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
    </main>
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
        {description} Scale: 1 is poor; 5 is excellent.
      </p>

      <div className="space-y-3">
        {categories.map((category) => (
          <StarRatingField
            key={category.value}
            name={`${idPrefix}-${category.value}`}
            label={category.label}
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
  emphasis = false,
}: StarRatingFieldProps) {
  const selectedScore = Number(value) || 0;

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
              aria-describedby={describedBy}
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
          aria-describedby={describedBy}
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

function detailedLabel(
  propertyValues: Record<string, string>,
  landlordValues: Record<string, string>
) {
  const answered = (values: Record<string, string>, categories: RatingCategory[]) =>
    categories.filter((category) => values[category.value]).length;
  const total = propertyRatingCategories.length + landlordRatingCategories.length;
  const count =
    answered(propertyValues, propertyRatingCategories) +
    answered(landlordValues, landlordRatingCategories);
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