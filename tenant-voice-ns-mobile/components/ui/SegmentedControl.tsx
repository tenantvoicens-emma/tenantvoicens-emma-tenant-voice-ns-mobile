type SegmentedControlProps<T extends string> = {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

// A row of mutually exclusive pill buttons, e.g. Sign in / Create account.
export default function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex w-full rounded-full border border-[#D9D6CE] bg-white p-1"
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
            className={`min-h-10 flex-1 rounded-full px-3 font-medium transition ${isActive ? "bg-[#08873A] text-white" : "text-[#4A5A52] hover:bg-[#F3F3E9]"}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
