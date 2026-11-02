import type { Metadata } from "next";

// The page itself is a client component, so its title lives here.
export const metadata: Metadata = {
  title: "Write a review",
  description:
    "Share what it's like to live in your rental building in Nova Scotia. Reviews are anonymous and checked by a moderator before they're published.",
};

export default function SubmitReviewLayout({
  children,
}: LayoutProps<"/submit-review">) {
  return children;
}
