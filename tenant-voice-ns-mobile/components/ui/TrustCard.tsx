import Link from "next/link";
import { ChevronRight, ShieldCheck } from "lucide-react";
import Card from "./Card";

export default function TrustCard() {
  return (
    <Link href="/policies" className="group block rounded-3xl">
      <Card tone="green">
        <div className="space-y-2">
          <h2 className="flex items-center gap-3 text-xl font-bold text-[#294B3A]">
            <ShieldCheck className="h-6 w-6 shrink-0" aria-hidden="true" />
            Built around trust
          </h2>

          <p className="text-lg text-[#4A5A52]">
            Anonymous to the public. Thoughtful moderation. Real experiences,
            presented with context.
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
