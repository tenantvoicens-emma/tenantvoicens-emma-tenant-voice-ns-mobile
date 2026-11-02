"use client";

import { useEffect } from "react";

// Last resort, used only if the site's layout itself crashes. It replaces
// the whole document, so it can't use the site's stylesheet: styles are
// inline.
export default function GlobalError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error("The site layout failed to render.", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F6F6EE",
          color: "#294B3A",
          fontFamily: "system-ui, sans-serif",
          padding: "24px",
        }}
      >
        <title>Something went wrong · Tenant Voice NS</title>
        <main style={{ maxWidth: 420 }}>
          <h1 style={{ fontSize: 32, margin: "0 0 12px" }}>
            Tenant Voice NS didn&apos;t load properly
          </h1>
          <p style={{ fontSize: 18, color: "#4A5A52", margin: "0 0 24px" }}>
            It&apos;s not something you did. Please try again in a moment.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              border: 0,
              borderRadius: 999,
              background: "#08873A",
              color: "#FFFFFF",
              fontSize: 18,
              padding: "14px 28px",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
