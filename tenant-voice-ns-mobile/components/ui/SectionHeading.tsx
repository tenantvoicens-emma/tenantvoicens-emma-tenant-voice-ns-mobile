type SectionHeadingProps = {
  title: string;
  subtitle?: string;
  id?: string;
};

export default function SectionHeading({
  title,
  subtitle,
  id,
}: SectionHeadingProps) {
  return (
    <div className="space-y-2">
      <h2 id={id} className="text-3xl font-bold tracking-tight text-[#294B3A]">
        {title}
      </h2>

      {subtitle && (
        <p className="text-lg text-[#66706B]">
          {subtitle}
        </p>
      )}
    </div>
  );
}
