"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type KeyboardEvent } from "react";
import StartReviewLink from "@/components/navigation/StartReviewLink";
import LoadError from "@/components/ui/LoadError";
import { useMediaQuery } from "@/lib/use-media-query";
import { getPropertyHref } from "@/lib/navigation";
import { propertyLocation } from "@/lib/property-display";
import { NO_SEARCH_RESULTS_HINT } from "@/lib/review-draft";
import type { PropertySearch } from "@/lib/use-property-search";
import { PropertyListing } from "@/types/property";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;

  suggestions: PropertyListing[];
  status: PropertySearch["status"];
  onRetry: () => void;
  id: string;
  label: string;
};

// The highlighted suggestion, remembered for the list it belongs to so a
// new list starts with nothing highlighted.
type ActiveOption = {
  list: PropertyListing[];
  index: number;
};

// A combobox: type to search, then use the up and down arrow keys to move
// through the matching properties and Enter to open one. On large screens
// the full result cards sit right below the search box, so it's a plain
// search box there, without the dropdown (which would list the same
// properties twice).
export default function SearchBar({
  value,
  onChange,
  suggestions,
  status,
  onRetry,
  id,
  label,
}: SearchBarProps) {
  const router = useRouter();
  const [active, setActive] = useState<ActiveOption | null>(null);
  // Escape hides the list until the renter types again.
  const [isDismissed, setIsDismissed] = useState(false);
  const listId = `${id}-listbox`;
  const optionId = (index: number) => `${id}-option-${index}`;
  const hasText = value.trim() !== "";
  const showsDropdown = !useMediaQuery("(min-width: 1024px)");
  const isOpen =
    showsDropdown && hasText && suggestions.length > 0 && !isDismissed;
  const activeIndex =
    isOpen && active?.list === suggestions ? active.index : -1;
  const showNoResults = hasText && status === "done" && suggestions.length === 0;

  function highlight(index: number) {
    setActive({ list: suggestions, index });
    document
      .getElementById(optionId(index))
      ?.scrollIntoView({ block: "nearest" });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!showsDropdown || !hasText || suggestions.length === 0) {
        return;
      }
      event.preventDefault();
      setIsDismissed(false);
      const last = suggestions.length - 1;
      if (event.key === "ArrowDown") {
        highlight(activeIndex >= last ? 0 : activeIndex + 1);
      } else {
        highlight(activeIndex <= 0 ? last : activeIndex - 1);
      }
      return;
    }

    if (event.key === "Enter" && activeIndex >= 0) {
      // Open the highlighted property instead of submitting the search.
      event.preventDefault();
      router.push(getPropertyHref(suggestions[activeIndex].slug, value));
      return;
    }

    if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      setActive(null);
      setIsDismissed(true);
    }
  }

  return (
    <div className="relative space-y-3">
      <label htmlFor={id} className="block text-lg font-medium text-[#4A5A52]">
        {label}
      </label>
      <input
        id={id}
        type="text"
        role={showsDropdown ? "combobox" : undefined}
        enterKeyHint="search"
        autoComplete="off"
        aria-autocomplete={showsDropdown ? "list" : undefined}
        aria-expanded={showsDropdown ? isOpen : undefined}
        aria-controls={showsDropdown ? listId : undefined}
        aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
        value={value}
        onChange={(event) => {
          setIsDismissed(false);
          onChange(event.target.value);
        }}
        onKeyDown={handleKeyDown}
        placeholder="Search properties or addresses..."
        className="
          w-full
          rounded-full
          border
          border-[#D9D6CE]
          bg-[#F6F6EE]
          px-6
          py-4
          text-lg
          focus:border-[#08873A]
          focus:bg-white
        "
      />

      {/* Always in the page (even when empty) so screen readers notice
          when the count changes. */}
      <p className="sr-only" role="status" aria-live="polite">
        {resultsAnnouncement(hasText, status, suggestions.length, showsDropdown)}
      </p>

      {showsDropdown && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Matching properties"
          hidden={!isOpen}
          className="overflow-hidden rounded-3xl border border-[#E6E3DA] bg-white"
        >
          {isOpen &&
            suggestions.map((property, index) => (
              <li
                key={property.id}
                role="presentation"
                className="border-b border-[#DEDCD5] last:border-b-0"
              >
                {/* Focus stays in the search box; the arrow keys move the
                    highlight. Tapping or clicking still follows the link. */}
                <Link
                  id={optionId(index)}
                  role="option"
                  aria-selected={index === activeIndex}
                  tabIndex={-1}
                  href={getPropertyHref(property.slug, value)}
                  className={`block p-4 hover:bg-[#EEF5EB] ${
                    index === activeIndex
                      ? "bg-[#EEF5EB] outline-2 -outline-offset-2 outline-[#08873A]"
                      : ""
                  }`}
                >
                  <span className="block font-medium">{property.name}</span>
                  <span className="block text-sm text-gray-500">
                    {propertyLocation(property, ", ")}
                  </span>
                </Link>
              </li>
            ))}
        </ul>
      )}

      {showNoResults && (
        <div className="space-y-2 rounded-3xl border border-[#E6E3DA] bg-white p-4 text-[#4A5A52]">
          <p>No properties match that search. {NO_SEARCH_RESULTS_HINT}</p>
          <p>
            Can&apos;t find your building?{" "}
            <StartReviewLink
              addBuilding={{ searchTerm: value }}
              className="font-medium text-[#2F4F46] underline decoration-[#2F4F46]/30 underline-offset-4"
            >
              Add it
            </StartReviewLink>
          </p>
        </div>
      )}

      {hasText && status === "error" && (
        <LoadError
          message="Search isn't working right now. Please try again in a moment."
          onRetry={onRetry}
        />
      )}
    </div>
  );
}

function resultsAnnouncement(
  hasText: boolean,
  status: PropertySearch["status"],
  count: number,
  showsDropdown: boolean
) {
  if (!hasText || status !== "done") {
    return "";
  }
  if (count === 0) {
    return "No properties match that search.";
  }
  const found = count === 1 ? "1 property found." : `${count} properties found.`;
  return showsDropdown
    ? `${found} Use the up and down arrow keys to choose one.`
    : `${found} They're listed under Search results.`;
}
