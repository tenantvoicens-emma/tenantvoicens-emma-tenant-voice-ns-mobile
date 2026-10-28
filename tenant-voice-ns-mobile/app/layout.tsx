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
      <body className="min-h-full bg-white px-2 py-3 sm:px-4">
        <Suspense fallback={null}>
          <HistoryTracker />
        </Suspense>
        {/* The whole app sits on one rounded cream panel, like a phone card. */}
        <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-md flex-col rounded-[2rem] border border-[#E6E3DA] bg-[#F6F6EE] shadow-sm">
          <header className="space-y-5 px-5 pt-6">
            <BrandHeader />
            <Suspense fallback={<TopNavigationFallback />}>
              <TopNavigation />
            </Suspense>
            <div className="border-t border-[#DEDCD5]" />
          </header>
          {children}
          <div className="mt-auto w-full px-5 pb-8">
            <div className="border-t border-[#DEDCD5] pt-4">
              <Suspense fallback={<TopNavigationFallback label="Footer navigation" />}>
                <TopNavigation label="Footer navigation" />
              </Suspense>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
