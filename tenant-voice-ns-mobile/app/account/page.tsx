import { Suspense } from "react";
import type { Metadata } from "next";

import PageContainer from "@/components/ui/PageContainer";
import AccountClient from "./AccountClient";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false },
};

export default function AccountPage() {
  return (
    <div>
      <PageContainer>
        <Suspense
          fallback={
            <p className="text-gray-600" role="status">
              Loading account options...
            </p>
          }
        >
          <AccountClient />
        </Suspense>
      </PageContainer>
    </div>
  );
}