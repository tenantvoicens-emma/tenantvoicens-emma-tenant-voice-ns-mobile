// Checks that a form post came from this site. With APP_ALLOWED_ORIGINS
// set (comma-separated, e.g. "https://tenantvoicens.ca"), only those
// origins are accepted; otherwise the request must come from the same
// origin it was sent to.
export function checkRequestOrigin(request: Request):
  | { ok: true; allowedHostnames: string[] }
  | { ok: false } {
  const origin = request.headers.get("origin");
  const requestUrl = new URL(request.url);
  const configuredOrigins = (process.env.APP_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  let requestOrigin: URL;
  try {
    requestOrigin = new URL(origin ?? "");
  } catch {
    return { ok: false };
  }

  const isAllowedOrigin = configuredOrigins.length > 0
    ? configuredOrigins.includes(requestOrigin.origin)
    : requestOrigin.origin === requestUrl.origin;

  if (!isAllowedOrigin) {
    return { ok: false };
  }

  const allowedHostnames = (
    configuredOrigins.length > 0 ? configuredOrigins : [requestOrigin.origin]
  ).flatMap((allowedOrigin) => {
    try {
      return [new URL(allowedOrigin).hostname.toLowerCase()];
    } catch {
      return [];
    }
  });

  return { ok: true, allowedHostnames };
}
