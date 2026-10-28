import { Suspense } from "react";

import BackLink from "@/components/navigation/BackLink";
import PageContainer from "@/components/ui/PageContainer";
import AccountClient from "./AccountClient";

export default function AccountPage() {
  return (
    <main>
      <PageContainer>
        <div className="mb-6">
          <BackLink fallback={{ url: "/", label: "Discover" }} />
        </div>
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
    </main>
  );
}