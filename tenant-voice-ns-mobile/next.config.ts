import type { NextConfig } from "next";

// Sent with every page. Kept to headers that can't break the site; a full
// Content-Security-Policy would also need to allow Cloudflare Turnstile
// and should be tested against the live widget first.
const securityHeaders = [
  // Other sites can't show this one inside a frame (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // Pages for renter-added buildings that turned out to duplicate a
  // listed one, sent to the building they were merged into.
  async redirects() {
    return [
      {
        source: "/properties/2300-gottingen-street-halifax",
        destination: "/properties/2300-gottingen-street-5501-cunard-street-halifax",
        permanent: true,
      },
    ];
  },
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
