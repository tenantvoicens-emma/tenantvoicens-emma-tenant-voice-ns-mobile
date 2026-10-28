import { NewBuilding } from "@/lib/review-draft";

type NewBuildingFieldsProps = {
  building: NewBuilding;
  onChange: (building: NewBuilding) => void;
  onCancel: () => void;
  fieldClassName: string;
};

const labelClassName = "block text-lg font-medium text-[#4A5A52]";

// Lets a renter add the building they lived in when search can't find it.
export default function NewBuildingFields({
  building,
  onChange,
  onCancel,
  fieldClassName,
}: NewBuildingFieldsProps) {
  const update = (changes: Partial<NewBuilding>) =>
    onChange({ ...building, ...changes });
  const addressNeedsNumber =
    building.address.trim() !== "" && !/^\s*\d/.test(building.address);

  return (
    <div className="space-y-4">
      <p className="text-[#4A5A52]">
        Add the building you lived in. We check every new building before it
        appears on the site, and it&apos;s published together with your review.
      </p>

      <div className="space-y-2">
        <label htmlFor="new-building-address" className={labelClassName}>
          Street address
        </label>
        <input
          id="new-building-address"
          required
          autoComplete="off"
          value={building.address}
          onChange={(event) => update({ address: event.target.value })}
          placeholder="e.g. 1234 Barrington Street"
          maxLength={120}
          aria-describedby="new-building-address-hint"
          className={fieldClassName}
        />
        <p
          id="new-building-address-hint"
          className={`text-sm ${addressNeedsNumber ? "text-red-700" : "text-[#66706B]"}`}
        >
          Start with the street number. Leave out your unit or apartment number.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="new-building-city" className={labelClassName}>
          Town or community
        </label>
        <input
          id="new-building-city"
          required
          autoComplete="off"
          value={building.city}
          onChange={(event) => update({ city: event.target.value })}
          placeholder="e.g. Halifax, Dartmouth, Bedford"
          maxLength={60}
          className={fieldClassName}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="new-building-name" className={labelClassName}>
          Building name{" "}
          <span className="font-normal text-[#66706B]">(optional)</span>
        </label>
        <input
          id="new-building-name"
          autoComplete="off"
          value={building.name}
          onChange={(event) => update({ name: event.target.value })}
          placeholder="e.g. Harbour Towers"
          maxLength={80}
          className={fieldClassName}
        />
      </div>

      <label className="flex items-start gap-3 rounded-2xl bg-[#F6F6EE] p-4">
        <input
          type="checkbox"
          required
          checked={building.hasFourOrMoreUnits}
          onChange={(event) =>
            update({ hasFourOrMoreUnits: event.target.checked })
          }
          className="mt-1 h-5 w-5 shrink-0 accent-[#08873A]"
        />
        <span className="text-[#1F2A24]">
          This building has 4 or more rental units.
          <span className="mt-1 block text-sm text-[#66706B]">
            Reviews of houses and duplexes could identify you to your landlord,
            so we only list larger buildings.
          </span>
        </span>
      </label>

      <button
        type="button"
        onClick={onCancel}
        className="font-medium text-[#2F4F46] underline decoration-[#2F4F46]/30 underline-offset-4"
      >
        Search the listed buildings instead
      </button>
    </div>
  );
}
