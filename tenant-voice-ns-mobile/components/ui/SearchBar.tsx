import Link from "next/link";
import { getPropertyHref } from "@/lib/navigation";
import { PropertyListing } from "@/types/property";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;

  suggestions: PropertyListing[];
  id?: string;
  label?: string;
};

export default function SearchBar({
  value,
  onChange,
  suggestions,
  id,
  label,
}: SearchBarProps) {
  return (
    <div className="relative space-y-3">
      {label && id && (
        <label htmlFor={id} className="block text-lg font-medium text-[#4A5A52]">
          {label}
        </label>
      )}
      <input
        id={id}
        type="text"
        aria-label={label && id ? undefined : "Search properties or addresses"}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
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
          outline-none
          focus:border-[#08873A]
          focus:bg-white
        "
      />

      {value.trim() !== "" &&
        suggestions.length > 0 && (
          <div
            className="
              overflow-hidden
              rounded-3xl
              border
              border-[#E6E3DA]
              bg-white
            "
          >
            {suggestions.map((property) => (
              <Link
                key={property.id}
                href={getPropertyHref(property.slug, value)}
                className="
                  block
                  last:border-b-0 border-b
                  p-4
                  hover:bg-[#EEF5EB]
                "
              >
                <p className="font-medium">
                  {property.name}
                </p>

                <p className="text-sm text-gray-500">
                  {property.city}
                </p>
              </Link>
            ))}
          </div>
        )}
    </div>
  );
}