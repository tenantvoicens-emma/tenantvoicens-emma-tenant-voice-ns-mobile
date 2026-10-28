import { Suspense } from "react";
import type { Metadata } from "next";
import BrandHeader from "@/components/navigation/BrandHeader";
import HistoryTracker from "@/components/navigation/HistoryTracker";
import TopNavigation, {
  TopNavigationFallback,
} from "@/components/navigation/TopNavigation";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tenant Voice NS",
  description: "Discover tenant experiences throughout Nova Scotia.",
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
        <Suspense fallback={null}>
          <HistoryTracker />
        </Suspense>
        {/* The whole app sits on one rounded cream panel: phone-card sized on
            phones, a little wider on tablets, wider still on laptops and
            desktops. */}
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
          <div id="main-content" tabIndex={-1} className="outline-none">
            {children}
          </div>
          <div className="mt-auto w-full px-5 pb-8 lg:px-10">
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
          </div>
        </div>
      </body>
    </html>
  );
}
