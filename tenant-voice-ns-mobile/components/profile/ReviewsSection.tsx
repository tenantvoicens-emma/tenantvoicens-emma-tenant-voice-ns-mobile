import Link from "next/link";

type ReviewsSectionProps = {
  reviewCount: number;
};

export default function ReviewsSection({ reviewCount }: ReviewsSectionProps) {
  return (
    <div className="space-y-2">
      <h2 className="text-3xl font-bold tracking-tight text-[#294B3A]">
        Individual reviews
      </h2>
      {reviewCount > 0 && (
        <>
          <p className="text-[#66706B]">
            Each card is one renter&apos;s own experience of the property,
            newest first. Reviews are personal accounts and opinions. They
            aren&apos;t verified, and they aren&apos;t inspections.
          </p>
          <p className="text-sm text-[#66706B]">
            Own or manage this property and have a concern about a review? Use
            &ldquo;Report this review&rdquo; under it, or{" "}
            <Link
              href="/policies#legal-concerns"
              className="font-medium text-[#2F4F46] underline underline-offset-4"
            >
              see how we handle concerns
            </Link>
            .
          </p>
        </>
      )}
    </div>
  );
}
