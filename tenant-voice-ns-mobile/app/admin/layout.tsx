import type { Metadata } from "next";

// The page itself is a client component, so its title lives here.
export const metadata: Metadata = {
  title: "Moderation",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return children;
}
