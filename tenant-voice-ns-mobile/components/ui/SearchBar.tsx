import Link from "next/link";
import { getPropertyHref } from "@/lib/navigation";
import { PropertyListing } from "@/types/property";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;

  suggestions: PropertyListing[];
};

export default function SearchBar({
  value,
  onChange,
  suggestions,
}: SearchBarProps) {
  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder="Search properties or addresses..."
        className="
          w-full
          rounded-3xl
          border
          border-[#DEDCD5]
          bg-white
          p-4
          outline-none
        "
      />

      {value.trim() !== "" &&
        suggestions.length > 0 && (
          <div
            className="
              mt-2
              overflow-hidden
              rounded-3xl
              border
              border-[#DEDCD5]
              bg-white
              shadow-sm
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