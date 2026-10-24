type BadgeProps = {
  text: string;
};

export default function Badge({
  text,
}: BadgeProps) {
  return (
    <span className="rounded-full bg-[#EEF5EB] px-3 py-1 text-sm font-medium text-[#2F4F46]">
      {text}
    </span>
  );
}