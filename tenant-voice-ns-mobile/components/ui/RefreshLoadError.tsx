"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import LoadError from "@/components/ui/LoadError";

// For server-rendered pages: "Try again" asks the server to render the
// page again.
export default function RefreshLoadError({ message }: { message: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <LoadError
      message={message}
      isRetrying={isPending}
      onRetry={() => startTransition(() => router.refresh())}
    />
  );
}
