import { PropertyListing } from "@/types/property";

// The line under a property's name: its street address and town. Most
// properties from the rental registry have no name, so their address *is*
// their name; it isn't repeated then.
export function propertyLocation(
  property: Pick<PropertyListing, "name" | "address" | "city">,
  separator = " · "
) {
  return [
    property.address !== property.name ? property.address : "",
    property.city,
  ]
    .filter(Boolean)
    .join(separator);
}
