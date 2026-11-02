"use client";

import { RotateCw } from "lucide-react";

type LoadErrorProps = {
  message: string;
  onRetry: () => void;
  isRetrying?: boolean;
};

// Shown in place of content that failed to load, with a way to try again.
export default function LoadError({
  message,
  onRetry,
  isRetrying = false,
}: LoadErrorProps) {
  return (
    <div
      className="space-y-3 rounded-3xl border border-[#E0C4BC] bg-[#FBEDE9] p-4"
      role="alert"
    >
      <p className="text-[#8A3B2B]">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        disabled={isRetrying}
        className="inline-flex items-center gap-2 rounded-full border border-[#D9D6CE] bg-white px-5 py-2 text-lg font-medium text-[#2F4F46] hover:bg-[#EEF5EB] disabled:opacity-60"
      >
        <RotateCw
          className={`h-5 w-5 ${isRetrying ? "animate-spin motion-reduce:animate-none" : ""}`}
          aria-hidden="true"
        />
        {isRetrying ? "Trying again..." : "Try again"}
      </button>
    </div>
  );
}
