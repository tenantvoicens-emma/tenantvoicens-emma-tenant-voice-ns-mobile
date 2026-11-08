// What kind of rental a property is (properties.rental_kind). Everything
// except "building" is a small rental, usually rented from a private
// landlord: with only a few tenants, the landlord may be able to tell who
// wrote a review, so the site shows only the year a review was written.

export type RentalKind =
  | "building"
  | "condo"
  | "small_building"
  | "house"
  | "suite"
  | "room";

// The order renters see in "What did you rent?".
export const rentalKindOptions: { value: RentalKind; label: string }[] = [
  { value: "building", label: "An apartment in a building with 4 or more units" },
  { value: "condo", label: "A condo, rented from its owner" },
  { value: "house", label: "A whole house" },
  { value: "small_building", label: "A unit in a duplex, or a building with 3 units or fewer" },
  { value: "suite", label: "A basement, in-law or backyard suite" },
  { value: "room", label: "A room in a shared home" },
];

// Shown on a small rental's page, after "Private rental".
export const rentalKindLabels: Record<Exclude<RentalKind, "building">, string> = {
  condo: "Condo",
  house: "House",
  small_building: "Duplex or small building",
  suite: "Basement or backyard suite",
  room: "Room rental",
};

export function isRentalKind(value: unknown): value is RentalKind {
  return rentalKindOptions.some((option) => option.value === value);
}

export function isSmallRentalKind(kind: string | null | undefined) {
  return isRentalKind(kind) && kind !== "building";
}
