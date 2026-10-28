import Link from "next/link";
import { Building2, ChevronRight } from "lucide-react";
import Card from "@/components/ui/Card";
import IconTile from "@/components/ui/IconTile";
import LabeledRating from "@/components/profile/LabeledRating";
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
  const location = [property.address, property.city].filter(Boolean).join(" · ");

  return (
    <Link href={getPropertyHref(property.slug, searchTerm)} className="block rounded-3xl">
      <Card>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <IconTile icon={Building2} tone="peach" />

            <div className="min-w-0 flex-1">
              <h3 className="text-xl font-bold text-[#294B3A]">
                {property.name}
              </h3>

              {location && (
                <p className="text-[#66706B]">
                  {location}
                </p>
              )}
            </div>

            <ChevronRight className="h-6 w-6 shrink-0 text-[#2F4F46]" aria-hidden="true" />
          </div>

          {(property.propertyRating !== undefined || property.landlordRating !== undefined) && (
            <div className="space-y-1.5">
              <LabeledRating label="Property" score={property.propertyRating ?? null} />
              <LabeledRating label="Landlord" score={property.landlordRating ?? null} />
            </div>
          )}

          {property.reviewCount !== undefined && (
            <p className="text-[#66706B]">
              {property.reviewCount} approved {property.reviewCount === 1 ? "review" : "reviews"}
            </p>
          )}
        </div>
      </Card>
    </Link>
  );
}
