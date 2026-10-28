"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import StartReviewLink from "@/components/navigation/StartReviewLink";

type NavigationProps = {
  // Each copy needs its own label so screen readers can tell them apart.
  label?: string;
};

export default function TopNavigation({
  label = "Main navigation",
}: NavigationProps) {
  // Pills always open a page fresh; "Back to ..." links restore state.
  const pathname = usePathname();
  const isOnReviewPage = pathname === "/submit-review";
  const isOnPoliciesPage = pathname === "/policies";
  const isOnAccountPage = pathname === "/account";

  return (
    <nav aria-label={label} className="flex flex-wrap gap-2">
      <Link
        href="/"
        aria-current={pathname === "/" ? "page" : undefined}
        className={navigationPill(pathname === "/")}
      >
        Discover
      </Link>

      {isOnReviewPage ? (
        <Link
          href="/submit-review"
          aria-current="page"
          className={navigationPill(true)}
        >
          Review
        </Link>
      ) : (
        <StartReviewLink className={navigationPill(false)}>
          Review
        </StartReviewLink>
      )}

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

export function TopNavigationFallback({
  label = "Main navigation",
}: NavigationProps) {
  return (
    <nav aria-label={label} className="flex flex-wrap gap-2">
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
      className="rounded-full border border-[#D9D6CE] px-5 py-2 text-lg text-[#4A5A52]"
    >
      {children}
    </Link>
  );
}

function navigationPill(isActive: boolean) {
  return isActive
    ? "rounded-full border border-[#08873A] bg-[#08873A] px-5 py-2 text-lg font-medium text-white"
    : "rounded-full border border-[#D9D6CE] px-5 py-2 text-lg text-[#4A5A52] hover:bg-white";
}