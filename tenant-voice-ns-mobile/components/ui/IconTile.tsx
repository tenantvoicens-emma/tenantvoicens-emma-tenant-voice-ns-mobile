import type { LucideIcon } from "lucide-react";

type IconTileProps = {
  icon: LucideIcon;
  tone?: "green" | "peach";
  size?: "md" | "lg";
};

const tones = {
  green: "bg-[#DDE9DD] text-[#2F4F46]",
  peach: "bg-[#F2E4D7] text-[#9A6440]",
};

const sizes = {
  md: "h-14 w-14 rounded-2xl [&>svg]:h-6 [&>svg]:w-6",
  lg: "h-20 w-20 rounded-3xl [&>svg]:h-8 [&>svg]:w-8",
};

// A rounded square holding one icon, used beside card titles.
export default function IconTile({
  icon: Icon,
  tone = "green",
  size = "md",
}: IconTileProps) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center ${tones[tone]} ${sizes[size]}`}
    >
      <Icon aria-hidden="true" />
    </span>
  );
}
