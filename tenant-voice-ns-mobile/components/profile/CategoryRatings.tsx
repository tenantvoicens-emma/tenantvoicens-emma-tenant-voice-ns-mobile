import { ChartColumn } from "lucide-react";
import Card from "@/components/ui/Card";
import { formatRatingScore } from "@/lib/format-rating";

export type CategoryAverage = {
  category: string;
  average: number;
  ratingCount: number;
};

type CategoryRatingsProps = {
  propertyAverages: CategoryAverage[];
  landlordAverages: CategoryAverage[];
  reviewCount: number;
};

// Per-category averages across every approved review. Drawn as bars on a
// tinted card, unlike the white star-rated review cards, so it doesn't
// read as one person's review.
export default function CategoryRatings({
  propertyAverages,
  landlordAverages,
  reviewCount,
}: CategoryRatingsProps) {
  return (
    <section aria-labelledby="category-averages-heading">
      <Card tone="green">
        <div className="space-y-5">
          <header className="space-y-2">
            <h2
              id="category-averages-heading"
              className="flex items-center gap-3 text-2xl font-bold tracking-tight text-[#294B3A]"
            >
              <ChartColumn className="h-6 w-6 shrink-0" aria-hidden="true" />
              Average by category
            </h2>
            <p className="text-[#4A5A52]">
              {reviewCount === 0
                ? "No approved reviews yet."
                : reviewCount === 1
                  ? "Scores from the one approved review so far. N/A answers aren't counted."
                  : `Averaged across all ${reviewCount} approved reviews. N/A answers aren't counted.`}
            </p>
          </header>

          <AverageGroup title="Property" averages={propertyAverages} />
          <AverageGroup title="Landlord" averages={landlordAverages} />
        </div>
      </Card>
    </section>
  );
}

function AverageGroup({
  title,
  averages,
}: {
  title: string;
  averages: CategoryAverage[];
}) {
  return (
    <div className="space-y-3 rounded-2xl bg-white/70 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-[#5B7A68]">
        {title}
      </h3>

      {averages.length === 0 ? (
        <p className="text-sm text-[#66706B]">No ratings yet.</p>
      ) : (
        <ul className="space-y-3">
          {averages.map((item) => (
            <li key={item.category} className="space-y-1">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[#1F2A24]">{item.category}</span>
                <span className="shrink-0 font-semibold tabular-nums text-[#294B3A]">
                  {formatRatingScore(item.average)}
                  <span className="font-normal text-[#66706B]" aria-hidden="true">/5</span>
                  <span className="sr-only"> out of 5</span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#DDE1DA]" aria-hidden="true">
                <div
                  className="h-full rounded-full bg-[#08873A]"
                  style={{ width: `${(Math.min(5, Math.max(0, item.average)) / 5) * 100}%` }}
                />
              </div>
              <p className="text-xs text-[#66706B]">
                {item.ratingCount} {item.ratingCount === 1 ? "rating" : "ratings"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
