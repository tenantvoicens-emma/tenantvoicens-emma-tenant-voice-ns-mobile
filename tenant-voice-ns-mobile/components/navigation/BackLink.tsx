"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { MouseEvent } from "react";

type BackLinkProps = {
  href: string;
  label: string;
};

export default function BackLink({ href, label }: BackLinkProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    if (
      searchParams.get("from") === "discover" &&
      window.history.length > 1
    ) {
      event.preventDefault();
      router.back();
    }
  }

  return (
    <Link
      href={href}
      onClick={handleClick}
      className="inline-flex min-h-11 items-center text-sm font-medium text-[#4CAF50]"
    >
      ← {label}
    </Link>
  );
}