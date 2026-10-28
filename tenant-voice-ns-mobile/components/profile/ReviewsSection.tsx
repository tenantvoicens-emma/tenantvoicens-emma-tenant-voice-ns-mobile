type ReviewsSectionProps = {
  reviewCount: number;
};

export default function ReviewsSection({ reviewCount }: ReviewsSectionProps) {
  return (
    <div className="space-y-1">
      <h2 className="text-3xl font-bold tracking-tight text-[#294B3A]">
        Individual reviews
      </h2>
      {reviewCount > 0 && (
        <p className="text-[#66706B]">
          Each card is one renter&apos;s experience, newest first.
        </p>
      )}
    </div>
  );
}
