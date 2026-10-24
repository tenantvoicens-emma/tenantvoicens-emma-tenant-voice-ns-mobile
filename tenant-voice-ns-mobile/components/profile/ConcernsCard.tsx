import Card from "@/components/ui/Card";

type ConcernsCardProps = {
  concerns: string[];
};

export default function ConcernsCard({
  concerns,
}: ConcernsCardProps) {
  return (
    <Card>
      <div className="space-y-3">
        <h3 className="font-bold text-[#2F4F46]">
          Top Concerns
        </h3>

        <ul className="space-y-2">
          {concerns.map((concerns) => (
            <li key={concerns}>
              ✅ {concerns}
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
