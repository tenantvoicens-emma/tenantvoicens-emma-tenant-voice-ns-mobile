import { Building2 } from "lucide-react";
import { Property } from "@/types/property";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import { isSmallRentalKind, rentalKindLabels } from "@/lib/rental-kind";

type PropertyHeaderProps = {
  property: Pick<Property, "name" | "address" | "city">;
  reviewCount: number;
  rentalKind?: string | null;
};

export default function PropertyHeader({
  property,
  reviewCount,
  rentalKind,
}: PropertyHeaderProps) {
  // Small rentals are labelled, and their landlord is always just "Private
  // landlord": never a name.
  const smallRentalLabel = isSmallRentalKind(rentalKind)
    ? rentalKindLabels[rentalKind as keyof typeof rentalKindLabels]
    : null;
  return (
    <div className="space-y-6">
      <Card tone="green">
        <div className="space-y-4">
          <Building2 className="h-10 w-10 text-[#2F4F46]" aria-hidden="true" />

          <h1 className="text-4xl font-bold leading-tight tracking-tight text-[#294B3A]">
            {property.name}
          </h1>

          <div className="text-xl text-[#4A5A52]">
            {property.address && property.address !== property.name && (
              <p>{property.address}</p>
            )}
            {property.city && <p>{property.city}</p>}
          </div>

          <div className="flex flex-wrap gap-2">
            {smallRentalLabel ? (
              <>
                <Badge text={`Private rental · ${smallRentalLabel}`} />
                <Badge text="Private landlord" />
              </>
            ) : (
              <Badge text="Property profile" />
            )}
            <Badge
              tone="gray"
              text={`${reviewCount} approved ${reviewCount === 1 ? "review" : "reviews"}`}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
