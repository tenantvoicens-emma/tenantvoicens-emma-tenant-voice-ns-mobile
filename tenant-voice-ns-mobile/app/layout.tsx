import { Suspense } from "react";
import Link from "next/link";
import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import BrandHeader from "@/components/navigation/BrandHeader";
import TopNavigation, {
  TopNavigationFallback,
} from "@/components/navigation/TopNavigation";
import { UnfinishedReviewDialogProvider } from "@/components/navigation/UnfinishedReviewDialog";
import { sharedOpenGraph, siteDescription as description } from "@/lib/page-metadata";
import { siteUrl } from "@/lib/site-url";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "Tenant Voice NS: rental reviews by Nova Scotia renters",
    template: "%s · Tenant Voice NS",
  },
  description,
  applicationName: "Tenant Voice NS",
  // Added to an iPhone home screen, it opens full screen like an app.
  appleWebApp: {
    capable: true,
    title: "Tenant Voice",
    statusBarStyle: "default",
  },
  openGraph: {
    ...sharedOpenGraph,
    title: "Tenant Voice NS",
    description,
  },
};

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-white px-2 py-3 sm:px-4 lg:py-6">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-[#08873A] focus:px-5 focus:py-3 focus:text-lg focus:font-medium focus:text-white"
        >
          Skip to main content
        </a>
        {/* One shared "unfinished review" dialog for every link that
            starts a new review. */}
        <UnfinishedReviewDialogProvider>
          {/* The whole app sits on one rounded cream panel: phone-card sized
              on phones, a little wider on tablets, wider still on laptops
              and desktops. */}
          <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-md flex-col rounded-[2rem] border border-[#E6E3DA] bg-[#F6F6EE] shadow-sm md:max-w-2xl lg:max-w-6xl">
            <header className="space-y-5 px-5 pt-6 lg:px-10 lg:pt-8">
              <div className="space-y-5 lg:flex lg:items-center lg:justify-between lg:gap-8 lg:space-y-0">
                <BrandHeader />
                <Suspense fallback={<TopNavigationFallback />}>
                  <TopNavigation />
                </Suspense>
              </div>
              <div className="border-t border-[#DEDCD5]" />
            </header>
            <main id="main-content" tabIndex={-1} className="outline-none">
              {children}
            </main>
            <footer className="mt-auto w-full px-5 pb-8 lg:px-10">
              <div className="border-t border-[#DEDCD5] pt-4">
                <Suspense fallback={<TopNavigationFallback label="Footer navigation" />}>
                  <TopNavigation label="Footer navigation" />
                </Suspense>
                <p className="mt-4 text-sm leading-relaxed text-[#66706B]">
                  <Link href="/terms" className="font-medium underline underline-offset-2">
                    Terms of Service
                  </Link>
                  {" · "}
                  <Link href="/policies" className="font-medium underline underline-offset-2">
                    Policies
                  </Link>
                </p>
                <p className="mt-3 text-sm leading-relaxed text-[#66706B]">
                  Building list from the Halifax Regional Municipality Residential
                  Rental Registry. Building names ©{" "}
                  <a
                    href="https://www.openstreetmap.org/copyright"
                    className="underline underline-offset-2"
                  >
                    OpenStreetMap contributors
                  </a>
                  .
                </p>
                {/* Hidden once it's opened from the home screen. */}
                <p className="mt-3 text-sm leading-relaxed text-[#66706B] [@media(display-mode:standalone)]:hidden">
                  <span className="font-medium text-[#4A5A52]">Tip:</span> add
                  Tenant Voice NS to your home screen to open it like an app.
                  On iPhone, tap Share, then Add to Home Screen. On Android,
                  open the browser menu (⋮), then Add to Home screen or Install
                  app.
                </p>
              </div>
            </footer>
          </div>
        </UnfinishedReviewDialogProvider>
        {/* Counts page visits (Vercel Web Analytics: no cookies, no
            personal data). It sits in its own Suspense boundary, so pages
            are still built on the server. */}
        <Analytics />
      </body>
    </html>
  );
}
