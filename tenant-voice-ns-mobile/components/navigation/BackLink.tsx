"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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
      className="mx-auto flex min-h-11 w-fit items-center gap-3 text-lg font-medium text-[#1F2A24] hover:underline"
    >
      <ArrowLeft className="h-5 w-5" aria-hidden="true" />
      {label}
    </Link>
  );
}