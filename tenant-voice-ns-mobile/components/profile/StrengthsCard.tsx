import Card from "@/components/ui/Card";

type StrengthsCardProps = {
  strengths: string[];
};

export default function StrengthsCard({
  strengths,
}: StrengthsCardProps) {
  return (
    <Card>
      <div className="space-y-3">
        <h3 className="font-bold text-[#2F4F46]">
          Top Strengths
        </h3>

        <ul className="space-y-2">
          {strengths.map((strength) => (
            <li key={strength}>
              ✅ {strength}
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}