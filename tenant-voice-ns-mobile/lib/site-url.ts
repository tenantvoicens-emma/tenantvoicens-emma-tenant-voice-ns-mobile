// The site's public address, for links in metadata, the sitemap and
// robots.txt. Set NEXT_PUBLIC_SITE_URL once there's a custom domain;
// until then Vercel's production address is used automatically.
export function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return "http://localhost:3000";
}
