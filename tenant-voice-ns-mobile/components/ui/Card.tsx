type CardProps = {
  children: React.ReactNode;
};

export default function Card({
  children,
}: CardProps) {
  return (
    <div className="rounded-3xl border border-[#DEDCD5] bg-white p-6 shadow-sm">
      {children}
    </div>
  );
}