import Card from "./Card";

export default function TrustCard() {
  return (
    <Card>
      <div className="space-y-2">
        <h3 className="font-bold text-[#2F4F46]">
          Trust & Safety
        </h3>

        <p className="text-sm text-gray-600">
          Reviews focus on tenant experiences and
          are moderated to help keep information
          respectful, informative, and useful.
        </p>
      </div>
    </Card>
  );
}