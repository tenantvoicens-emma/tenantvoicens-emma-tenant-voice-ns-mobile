"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import StartReviewLink from "@/components/navigation/StartReviewLink";
import { useAccountStatus } from "@/lib/use-account-status";

type NavigationProps = {
  // Each copy needs its own label so screen readers can tell them apart.
  label?: string;
};

export default function TopNavigation({
  label = "Main navigation",
}: NavigationProps) {
  const pathname = usePathname();
  const isOnReviewPage = pathname === "/submit-review";
  const isOnPoliciesPage = pathname === "/policies";

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

      <AccountLink pathname={pathname} />
    </nav>
  );
}

// "Sign In" for visitors and "Account" once signed in. For the moderator
// it's "Moderation" with the number of reviews waiting, and goes straight
// to the moderation queue.
function AccountLink({ pathname }: { pathname: string }) {
  const { signedIn, isModerator, pendingCount } = useAccountStatus();

  if (isModerator) {
    const isCurrent = pathname === "/admin";
    const waiting = pendingCount ?? 0;
    return (
      <Link
        href="/admin"
        aria-current={isCurrent ? "page" : undefined}
        className={`${navigationPill(isCurrent)} inline-flex items-center gap-2`}
      >
        Moderation{" "}
        {waiting > 0 && (
          <span
            className={`rounded-full px-2 text-base font-semibold ${
              isCurrent ? "bg-white text-[#08873A]" : "bg-[#08873A] text-white"
            }`}
          >
            {waiting}
            <span className="sr-only">
              {waiting === 1 ? " review waiting" : " reviews waiting"}
            </span>
          </span>
        )}
      </Link>
    );
  }

  const isCurrent = pathname === "/account";
  return (
    <Link
      href="/account"
      aria-current={isCurrent ? "page" : undefined}
      className={navigationPill(isCurrent)}
    >
      {signedIn ? "Account" : "Sign In"}
    </Link>
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