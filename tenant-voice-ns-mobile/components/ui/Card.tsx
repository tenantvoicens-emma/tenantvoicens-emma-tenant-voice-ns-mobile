type CardProps = {
  children: React.ReactNode;
  tone?: "white" | "green";
};

const tones = {
  white: "border border-[#E6E3DA] bg-white",
  green: "bg-[#E6EEE3]",
};

export default function Card({
  children,
  tone = "white",
}: CardProps) {
  return (
    <div className={`rounded-3xl p-6 ${tones[tone]}`}>
      {children}
    </div>
  );
}
