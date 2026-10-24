import Link from "next/link";
import Button from "@/components/ui/Button";

type LeaveReviewCTAProps = {
  propertySlug: string;
};

export default function LeaveReviewCTA({ propertySlug }: LeaveReviewCTAProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-xl font-bold text-[#2F4F46]">
        Lived here?
      </h3>

      <p className="text-gray-600">
        Help future renters by sharing
        your experience.
      </p>

      <Link href={`/submit-review?property=${encodeURIComponent(propertySlug)}`}>
        <Button text="Share Your Experience" />
      </Link>

    </div>
  );
}