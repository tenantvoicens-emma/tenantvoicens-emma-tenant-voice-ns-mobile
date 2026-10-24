import Link from "next/link";
import Card from "@/components/ui/Card";
import { getPropertyHref } from "@/lib/navigation";
import { PropertyListing } from "@/types/property";

type PropertyPreviewCardProps = {
  property: PropertyListing;
  searchTerm: string;
};

export default function PropertyPreviewCard({
  property,
  searchTerm,
}: PropertyPreviewCardProps) {
  return (
    <Link href={getPropertyHref(property.slug, searchTerm)}>
      <Card>
        <div className="space-y-3">
          <div>
            <h3 className="text-xl font-bold text-[#2F4F46]">
              {property.name}
            </h3>

            {property.address && (
              <p className="text-sm text-gray-500">
                {property.address}
              </p>
            )}

            <p className="text-sm text-gray-500">
              {property.city}
            </p>
          </div>

          {property.reviewCount !== undefined && (
            <p className="text-sm text-gray-600">
              {property.reviewCount} approved {property.reviewCount === 1 ? "review" : "reviews"}
            </p>
          )}
        </div>
      </Card>
    </Link>
  );
}