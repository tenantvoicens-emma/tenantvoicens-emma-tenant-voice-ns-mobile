import Link from "next/link";
import { ChevronRight } from "lucide-react";
import Card from "./Card";

export default function TrustCard() {
  return (
    <Link href="/policies" className="group block rounded-3xl">
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

          <p className="inline-flex items-center gap-1 text-sm font-medium text-[#2F4F46] group-hover:underline">
            Read our policies
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </p>
        </div>
      </Card>
    </Link>
  );
}
