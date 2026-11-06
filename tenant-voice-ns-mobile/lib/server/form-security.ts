import { createHmac } from "node:crypto";
import { isIP } from "node:net";

// Shared by the forms that post to the server (reviews and review
// reports): the Cloudflare Turnstile check and the IP fingerprint used for
// rate limits.

export type TurnstileResult =
  | { ok: true }
  | { ok: false; error: string; status: number };

// Checks a Turnstile token with Cloudflare. `action` must match the one
// the form's widget was given, so a token from one form can't be reused on
// another. Throws if Cloudflare can't be reached.
export async function verifyTurnstile({
  secret,
  token,
  action,
  allowedHostnames,
}: {
  secret: string;
  token: string;
  action: string;
  allowedHostnames: string[];
}): Promise<TurnstileResult> {
  const verificationResponse = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      body: new URLSearchParams({ secret, response: token }),
      cache: "no-store",
    }
  );

  if (!verificationResponse.ok) {
    throw new Error("Turnstile verification request failed.");
  }

  const verification = (await verificationResponse.json()) as {
    success?: boolean;
    action?: string;
    hostname?: string;
    "error-codes"?: string[];
  };

  if (!verification.success) {
    console.warn(
      `Turnstile rejected a ${action} request.`,
      verification["error-codes"] ?? []
    );
    return {
      ok: false,
      status: 400,
      error: "The security check could not be verified. Please try again.",
    };
  }

  if (verification.action !== action) {
    console.warn(`Turnstile action did not match ${action}.`);
    return {
      ok: false,
      status: 400,
      error:
        "The security check did not match this form. Please refresh and try again.",
    };
  }

  if (
    !verification.hostname ||
    !allowedHostnames.includes(verification.hostname.toLowerCase())
  ) {
    console.warn("Turnstile hostname did not match the allowed request origin.");
    return {
      ok: false,
      status: 400,
      error:
        "The security check did not match this site. Please refresh and try again.",
    };
  }

  return { ok: true };
}

// Only headers that Vercel sets itself, overwriting anything the browser
// sent. (cf-connecting-ip is not one of them on Vercel: a browser could
// send a new made-up value with every request to dodge the rate limit.)
export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const candidates = [
    request.headers.get("x-vercel-forwarded-for"),
    forwardedFor?.split(",")[0],
    request.headers.get("x-real-ip"),
  ];

  return candidates
    .map((candidate) => candidate?.trim())
    .find((candidate): candidate is string => Boolean(candidate && isIP(candidate)));
}

// A one-way fingerprint of an IP address, so rate limits never store the
// address itself.
export function ipFingerprint(clientIp: string, key: string) {
  return createHmac("sha256", key).update(clientIp).digest("hex");
}
