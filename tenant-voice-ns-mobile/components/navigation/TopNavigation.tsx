"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export default function TopNavigation() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchTerm = searchParams.get("q")?.trim() ?? "";
  const discoverHref = searchTerm
    ? `/?q=${encodeURIComponent(searchTerm)}`
    : "/";
  const isOnReviewPage = pathname === "/submit-review";
  const isOnPoliciesPage = pathname === "/policies";
  const isOnAccountPage = pathname === "/account";

  return (
    <nav aria-label="Main navigation" className="flex flex-wrap gap-2">
      <Link
        href={discoverHref}
        aria-current={pathname === "/" ? "page" : undefined}
        className={navigationPill(pathname === "/")}
      >
        Discover
      </Link>

      <Link
        href="/submit-review"
        aria-current={isOnReviewPage ? "page" : undefined}
        className={navigationPill(isOnReviewPage)}
      >
        Review
      </Link>

      <Link
        href="/policies"
        aria-current={isOnPoliciesPage ? "page" : undefined}
        className={navigationPill(isOnPoliciesPage)}
      >
        Policies
      </Link>

      <Link
        href="/account"
        aria-current={isOnAccountPage ? "page" : undefined}
        className={navigationPill(isOnAccountPage)}
      >
        Sign In
      </Link>
    </nav>
  );
}

export function TopNavigationFallback() {
  return (
    <nav aria-label="Main navigation" className="flex flex-wrap gap-2">
      <StaticNavigationLink href="/">Discover</StaticNavigationLink>
      <StaticNavigationLink href="/submit-review">Review</StaticNavigationLink>
      <StaticNavigationLink href="/policies">Policies</StaticNavigationLink>
      <StaticNavigationLink href="/account">Sign In</StaticNavigationLink>
    </nav>
  );
}

function StaticNavigationLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-full border border-[#DEDCD5] px-4 py-2 text-[#2F4F46]"
    >
      {children}
    </Link>
  );
}

function navigationPill(isActive: boolean) {
  return isActive
    ? "rounded-full bg-[#EEF5EB] px-4 py-2 font-medium text-[#2F4F46]"
    : "rounded-full border border-[#DEDCD5] px-4 py-2 text-[#2F4F46]";
}