import { Property } from "@/types/property";
import BackLink from "@/components/navigation/BackLink";

type PropertyHeaderProps = {
  property: Pick<Property, "name" | "address" | "city">;
  backHref: string;
};

export default function PropertyHeader({
  property,
  backHref,
}: PropertyHeaderProps) {
  return (
    <div className="space-y-3">
      <BackLink href={backHref} label="Back to Discover" />

      <div>
        <p className="text-sm text-gray-500">
          {property.address}
        </p>

        <p className="text-sm text-gray-500">
          {property.city}
        </p>

        <h1 className="mt-2 text-3xl font-bold text-[#2F4F46]">
          {property.name}
        </h1>
      </div>
    </div>
  );
}