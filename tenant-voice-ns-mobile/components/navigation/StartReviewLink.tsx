"use client";

import Link from "next/link";
import { type MouseEvent, type ReactNode } from "react";
import { useUnfinishedReviewDialog } from "@/components/navigation/UnfinishedReviewDialog";
import {
  hasUnsavedWork,
  readDraft,
  reviewFormHref,
  writeDraft,
} from "@/lib/review-draft";

type StartReviewLinkProps = {
  // The property the new review is for, if the link starts one for a
  // specific property.
  propertySlug?: string;
  // Opens the form ready to add a building that isn't listed, starting
  // from what the renter searched for.
  addBuilding?: { searchTerm: string };
  className?: string;
  children: ReactNode;
} & Pick<React.ComponentProps<typeof Link>, "aria-current">;

// A link that opens a fresh review form. If an unfinished review would be
// thrown away, it asks first (in the shared dialog): continue it, or
// discard it and start over.
export default function StartReviewLink({
  propertySlug,
  addBuilding,
  className,
  children,
  ...linkProps
}: StartReviewLinkProps) {
  const askAboutDraft = useUnfinishedReviewDialog();
  const href = reviewFormHref({ propertySlug, addBuilding });

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    const draft = readDraft();

    // Reopening the same property's review just continues it.
    if (propertySlug && draft?.propertySlug === propertySlug) {
      return;
    }

    if (!hasUnsavedWork(draft) || !askAboutDraft) {
      writeDraft(null);
      return;
    }

    event.preventDefault();
    askAboutDraft(draft, href);
  }

  return (
    <Link href={href} onClick={handleClick} className={className} {...linkProps}>
      {children}
    </Link>
  );
}
