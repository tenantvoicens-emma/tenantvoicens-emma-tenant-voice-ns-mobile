import { Suspense } from "react";

import PageContainer from "@/components/ui/PageContainer";
import AccountClient from "./AccountClient";

export default function AccountPage() {
  return (
    <main>
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
    </main>
  );
}