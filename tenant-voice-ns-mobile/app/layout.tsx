import { Suspense } from "react";
import type { Metadata } from "next";
import BrandHeader from "@/components/navigation/BrandHeader";
import TopNavigation, {
  TopNavigationFallback,
} from "@/components/navigation/TopNavigation";
import { UnfinishedReviewDialogProvider } from "@/components/navigation/UnfinishedReviewDialog";
import { siteUrl } from "@/lib/site-url";
import "./globals.css";

const description =
  "Honest, moderated reviews of rental buildings and landlords from Nova Scotia renters. Read what it's like to live there, or share your own experience anonymously.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "Tenant Voice NS: rental reviews by Nova Scotia renters",
    template: "%s · Tenant Voice NS",
  },
  description,
  applicationName: "Tenant Voice NS",
  openGraph: {
    type: "website",
    siteName: "Tenant Voice NS",
    locale: "en_CA",
    title: "Tenant Voice NS",
    description,
  },
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
              </div>
            </footer>
          </div>
        </UnfinishedReviewDialogProvider>
      </body>
    </html>
  );
}
