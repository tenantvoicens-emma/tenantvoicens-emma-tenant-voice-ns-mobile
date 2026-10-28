import Link from "next/link";
import { House } from "lucide-react";

export default function BrandHeader() {
  return (
    <Link href="/" className="flex items-center gap-4" aria-label="Tenant Voice NS home">
      <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#DDE9DD] text-[#2F4F46]">
        <House className="h-7 w-7" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-3xl font-bold leading-tight tracking-tight text-[#294B3A]">
          tenant voice
        </span>
        <span className="block text-sm font-medium uppercase tracking-wide text-[#5B7A68]">
          Nova Scotia · Renters helping renters
        </span>
      </span>
    </Link>
  );
}
