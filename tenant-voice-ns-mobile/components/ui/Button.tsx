import type { LucideIcon } from "lucide-react";

type ButtonProps = {
  text: string;
  onClick?: () => void;
  type?: "button" | "submit";
  icon?: LucideIcon;
};

export default function Button({
  text,
  onClick,
  type = "button",
  icon: Icon,
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="
        flex
        w-full
        items-center
        justify-center
        gap-3
        rounded-full
        bg-[#08873A]
        py-4
        text-lg
        font-medium
        text-white
        transition
        hover:brightness-95
      "
    >
      {Icon && <Icon className="h-6 w-6" aria-hidden="true" />}
      {text}
    </button>
  );
}
