import { Building2 } from "lucide-react";
import { Property } from "@/types/property";
import BackLink from "@/components/navigation/BackLink";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";

type PropertyHeaderProps = {
  property: Pick<Property, "name" | "address" | "city">;
  backHref: string;
  reviewCount: number;
};

export default function PropertyHeader({
  property,
  backHref,
  reviewCount,
}: PropertyHeaderProps) {
  return (
    <div className="space-y-6">
      <BackLink href={backHref} label="Back to Discover" />

      <Card tone="green">
        <div className="space-y-4">
          <Building2 className="h-10 w-10 text-[#2F4F46]" aria-hidden="true" />

          <h1 className="text-4xl font-bold leading-tight tracking-tight text-[#294B3A]">
            {property.name}
          </h1>

          <div className="text-xl text-[#4A5A52]">
            {property.address && <p>{property.address}</p>}
            {property.city && <p>{property.city}</p>}
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge text="Property profile" />
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
