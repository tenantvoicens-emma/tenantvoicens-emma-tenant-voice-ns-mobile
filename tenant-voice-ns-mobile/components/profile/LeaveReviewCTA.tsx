import StartReviewLink from "@/components/navigation/StartReviewLink";

type LeaveReviewCTAProps = {
  propertySlug: string;
};

export default function LeaveReviewCTA({ propertySlug }: LeaveReviewCTAProps) {
  return (
    <div className="space-y-3">
      <h2 className="text-3xl font-bold tracking-tight text-[#294B3A]">
        Lived here?
      </h2>

      <p className="text-lg text-[#66706B]">
        Help future renters by sharing
        your experience.
      </p>

      <StartReviewLink
        propertySlug={propertySlug}
        className="flex w-full items-center justify-center rounded-full bg-[#08873A] py-4 text-lg font-medium text-white transition hover:brightness-95"
      >
        Share Your Experience
      </StartReviewLink>
    </div>
  );
}
