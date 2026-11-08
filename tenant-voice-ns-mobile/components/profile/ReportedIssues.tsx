import { TriangleAlert } from "lucide-react";

import Card from "@/components/ui/Card";
import { reviewIssueLabel } from "@/lib/review-issues";

export type IssueCount = {
  issue: string;
  count: number;
};

type ReportedIssuesProps = {
  issueCounts: IssueCount[];
  reviewCount: number;
};

// How many reviewers ticked each problem from the fixed list. These are
// counts of what renters reported, not findings: the property page says so.
export default function ReportedIssues({
  issueCounts,
  reviewCount,
}: ReportedIssuesProps) {
  if (issueCounts.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="reported-issues-heading">
      <Card>
        <div className="space-y-4">
          <header className="space-y-1">
            <h2
              id="reported-issues-heading"
              className="flex items-center gap-3 text-2xl font-bold tracking-tight text-[#294B3A]"
            >
              <TriangleAlert className="h-6 w-6 shrink-0" aria-hidden="true" />
              Problems reviewers reported
            </h2>
            <p className="text-sm text-[#66706B]">
              What renters ticked about this property, out of {reviewCount}{" "}
              {reviewCount === 1 ? "review" : "reviews"}. These are
              renters&apos; own reports, not inspections or findings.
            </p>
          </header>
          <ul className="divide-y divide-[#EEECE6]">
            {issueCounts.map(({ issue, count }) => (
              <li
                key={issue}
                className="flex items-baseline justify-between gap-3 py-2"
              >
                <span className="min-w-0 text-[#1F2A24]">
                  {reviewIssueLabel(issue)}
                </span>
                <span className="shrink-0 font-semibold tabular-nums text-[#294B3A]">
                  {count} of {reviewCount}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </section>
  );
}
