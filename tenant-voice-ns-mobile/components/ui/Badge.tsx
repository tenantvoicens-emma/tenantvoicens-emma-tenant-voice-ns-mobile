type BadgeProps = {
  text: string;
  tone?: "green" | "gray";
};

const tones = {
  green: "bg-[#C5E8C8] text-[#1C7A36]",
  gray: "bg-[#DDE1DA] text-[#2B3A33]",
};

export default function Badge({
  text,
  tone = "green",
}: BadgeProps) {
  return (
    <span className={`rounded-full px-3 py-1 text-sm font-medium ${tones[tone]}`}>
      {text}
    </span>
  );
}
