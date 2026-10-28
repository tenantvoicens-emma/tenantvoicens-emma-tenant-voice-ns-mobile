"use client";

import { Turnstile } from "@marsidev/react-turnstile";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Star } from "lucide-react";

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
  const [properties, setProperties] = useState<PropertyListing[]>([]);
  const [isLoadingProperties, setIsLoadingProperties] = useState(true);
  const [propertyLoadError, setPropertyLoadError] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProperty, setSelectedProperty] =
    useState<PropertyListing | null>(null);
  const [occupancyDuration, setOccupancyDuration] = useState("");
  const [wouldLiveAgain, setWouldLiveAgain] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [propertyRatings, setPropertyRatings] = useState<Record<string, string>>(
    {}
  );
  const [landlordRatings, setLandlordRatings] = useState<Record<string, string>>(
    {}
  );
  const [showPreview, setShowPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] =
    useState<SubmissionStatus>(null);
  const [submissionError, setSubmissionError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileError, setTurnstileError] = useState(false);
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  // The profile this form was opened from, for the "Back to profile" link.
  const [profileProperty, setProfileProperty] =
    useState<PropertyListing | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadProperties() {
      try {
        const { data, error } = await supabase
          .from("properties")
          .select("id, slug, name, address, city")
          .order("name");

        if (error) {
          throw error;
        }

        if (isActive) {
          const propertyListings = (data ?? []).map((property) => ({
            ...property,
            address: property.address ?? "",
            city: property.city ?? "",
          }));
          setProperties(propertyListings);

          const requestedSlug = new URLSearchParams(window.location.search).get(
            "property"
          );
          const requestedProperty = propertyListings.find(
            (property) => property.slug === requestedSlug
          );

          if (requestedProperty) {
            setProfileProperty(requestedProperty);
            setSelectedProperty(requestedProperty);
            setSearchTerm(requestedProperty.name);
          }
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

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const filteredProperties = properties.filter((property) =>
    [property.name, property.address, property.city].some((value) =>
      value.toLowerCase().includes(normalizedSearchTerm)
    )
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmissionStatus(null);
    setShowPreview(true);
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
    if (!selectedProperty || !turnstileToken || isSubmitting) {
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
          propertyId: selectedProperty.id,
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
    <main className="px-5 py-6">
      <div className="space-y-6">
        {profileProperty && (
          <Link
            href={`/properties/${encodeURIComponent(profileProperty.slug)}`}
            className="mx-auto flex min-h-11 w-fit items-center gap-3 text-lg font-medium text-[#1F2A24] hover:underline"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            Back to profile
          </Link>
        )}

        <h1 className="text-4xl font-bold leading-tight tracking-tight text-[#294B3A]">
          Your experience matters
        </h1>

        <p className="text-lg text-[#66706B]">
          A guided review helps other renters understand what day-to-day life
          can be like.
        </p>

        <p className="text-sm text-[#66706B]">
          You can submit anonymously. If you sign in, your review can be privately
          linked to your account for future account features; your identity is
          never shown publicly. <Link className="font-medium text-[#2F4F46] underline" href="/account">Sign in or create an account</Link>.
        </p>

        <form onSubmit={handleSubmit} className="space-y-8">
          <section className={formCard} aria-labelledby="property-heading">
            <h2 id="property-heading" className="text-xl font-bold text-[#294B3A]">
              Property
            </h2>
            <div className="space-y-2">
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
                  setShowPreview(false);
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

              {normalizedSearchTerm &&
                !selectedProperty &&
                !isLoadingProperties &&
                !propertyLoadError && (
                  <ul
                    id="property-suggestions"
                    className="overflow-hidden rounded-2xl border border-[#E6E3DA] bg-white"
                  >
                    {filteredProperties.length > 0 ? (
                      filteredProperties.map((property) => (
                        <li key={property.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProperty(property);
                              setSearchTerm(property.name);
                              setShowPreview(false);
                            }}
                            className="block w-full border-b border-[#DEDCD5] p-3 text-left last:border-b-0 hover:bg-[#EEF5EB]"
                          >
                            <span className="block font-medium">
                              {property.name}
                            </span>
                            <span className="block text-sm text-gray-500">
                              {[property.address, property.city]
                                .filter(Boolean)
                                .join(", ")}
                            </span>
                          </button>
                        </li>
                      ))
                    ) : (
                      <li className="p-3 text-sm text-gray-600">
                        No matching property. Property requests are not available
                        yet.
                      </li>
                    )}
                  </ul>
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

            <div className="space-y-2">
              <label htmlFor="review-text" className="block text-lg font-medium text-[#4A5A52]">
                What would you like other renters to know?
              </label>
              <textarea
                id="review-text"
                required
                value={reviewText}
                onChange={(event) => setReviewText(event.target.value)}
                placeholder="Describe your experience without names or private details..."
                rows={6}
                className={formField}
              />
            </div>
          </section>

          <RatingGroup
            title="Property ratings"
            description="Rate the building and shared spaces. Choose N/A when you can’t assess a category."
            categories={propertyRatingCategories}
            values={propertyRatings}
            onChange={(category, value) =>
              updateRating("property", category, value)
            }
            idPrefix="property-rating"
          />

          <RatingGroup
            title="Landlord ratings"
            description="Rate the property manager or landlord. Choose N/A when you can’t assess a category."
            categories={landlordRatingCategories}
            values={landlordRatings}
            onChange={(category, value) =>
              updateRating("landlord", category, value)
            }
            idPrefix="landlord-rating"
          />

          <div className="space-y-3">
            <button
              type="submit"
              disabled={!selectedProperty}
              className="w-full rounded-full bg-[#08873A] py-4 text-lg font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Preview Review
            </button>

            {showPreview && selectedProperty && (
              <section
                className="space-y-4 rounded-3xl border border-[#E6E3DA] bg-white p-6"
                aria-labelledby="review-preview-heading"
                aria-live="polite"
              >
                <div>
                  <h2
                    id="review-preview-heading"
                    className="text-xl font-bold text-[#2F4F46]"
                  >
                    Review preview
                  </h2>
                  <p className="text-sm text-gray-600">
                    Check your answers. Submitted reviews are held for moderation.
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="font-medium">{selectedProperty.name}</p>
                  <p>
                    Time lived there: {getOptionLabel(occupancyOptions, occupancyDuration)}
                  </p>
                  <p>
                    Would live there again: {getWouldLiveAgainLabel(wouldLiveAgain)}
                  </p>
                  <p className="whitespace-pre-wrap">{reviewText}</p>
                </div>

                <RatingPreview
                  title="Property ratings"
                  categories={propertyRatingCategories}
                  values={propertyRatings}
                />
                <RatingPreview
                  title="Landlord ratings"
                  categories={landlordRatingCategories}
                  values={landlordRatings}
                />

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
                  <p className="text-sm text-red-700" role="alert">
                    Review submission security is not configured yet.
                  </p>
                )}

                {turnstileError && (
                  <p className="text-sm text-red-700" role="alert">
                    The security check failed to load. Please refresh and try again.
                  </p>
                )}

                {submissionStatus === "success" ? (
                  <p className="text-green-800" role="status">
                    Review submitted. It will appear after moderation approval.
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={submitReview}
                    disabled={isSubmitting || !turnstileToken || !turnstileSiteKey}
                    className="w-full rounded-full bg-[#08873A] py-4 text-lg font-medium text-white disabled:cursor-wait disabled:opacity-60"
                  >
                    {isSubmitting ? "Submitting..." : "Submit for moderation"}
                  </button>
                )}

                {submissionStatus === "error" && (
                  <p className="text-red-700" role="alert">
                    {submissionError || "We couldn’t submit your review. Please try again."}
                  </p>
                )}
              </section>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}

const formCard = "space-y-4 rounded-3xl border border-[#E6E3DA] bg-white p-6";
const formField =
  "w-full rounded-2xl border border-[#D9D6CE] bg-white p-4 text-lg outline-none focus:border-[#08873A]";

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
        {categories.map((category) => {
          const groupName = `${idPrefix}-${category.value}`;
          const selectedValue = values[category.value] ?? "";
          const selectedScore = Number(selectedValue) || 0;
          const hasExplicitValue = Object.hasOwn(values, category.value);

          return (
            <fieldset
              key={category.value}
              className="space-y-2"
            >
              <legend className="text-lg font-medium text-[#4A5A52]">
                {category.label}
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
                      name={groupName}
                      value={score}
                      checked={selectedValue === String(score)}
                      aria-describedby={`${idPrefix}-scale`}
                      onChange={() =>
                        onChange(category.value, String(score))
                      }
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
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { value: "na", label: "N/A" },
                  { value: "", label: "Not rated" },
                ].map((choice) => (
                  <label key={choice.label} className="cursor-pointer">
                    <input
                      type="radio"
                      name={groupName}
                      value={choice.value}
                      checked={
                        hasExplicitValue && selectedValue === choice.value
                      }
                      aria-describedby={`${idPrefix}-scale`}
                      onChange={() =>
                        onChange(category.value, choice.value)
                      }
                      className="peer sr-only"
                    />
                    <span className="inline-flex min-h-11 items-center rounded-full border border-[#D9D6CE] px-4 text-sm peer-checked:border-[#2F4F46] peer-checked:bg-[#DDEBD8] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#2F4F46]">
                      {choice.label}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          );
        })}
      </div>
    </fieldset>
  );
}

function RatingPreview({
  title,
  categories,
  values,
}: {
  title: string;
  categories: RatingCategory[];
  values: Record<string, string>;
}) {
  return (
    <div className="space-y-2">
      <h3 className="font-semibold">{title}</h3>
      <ul className="space-y-1 text-sm text-gray-600">
        {categories.map((category) => (
          <li key={category.value}>
            {category.label}: {values[category.value] === "na"
              ? "N/A"
              : values[category.value] || "Not rated"}
          </li>
        ))}
      </ul>
    </div>
  );
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