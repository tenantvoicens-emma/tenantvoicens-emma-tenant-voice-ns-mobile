import { createClient } from "@supabase/supabase-js";
import {
  getClientIp,
  ipFingerprint,
  verifyTurnstile,
} from "@/lib/server/form-security";
import { checkRequestOrigin } from "@/lib/server/request-origin";
import {
  isLegalConcern,
  isReportReason,
  LEGAL_CONCERN_MIN_DETAILS,
  looksLikeEmail,
  REPORT_DETAILS_LIMIT,
  type ReportReason,
} from "@/lib/review-reports";

type ReportRequest = {
  turnstileToken: string;
  reviewId: number;
  reason: ReportReason;
  details?: string;
  contactEmail?: string;
};

const UNAVAILABLE = "Reporting is temporarily unavailable. Please try again later.";

// "Report this review": saves a private report for the moderator. The
// review stays up until the moderator looks at it.
export async function POST(request: Request) {
  const originCheck = checkRequestOrigin(request);
  if (!originCheck.ok) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  if (new TextEncoder().encode(rawBody).byteLength > 10_000) {
    return Response.json({ error: "Report is too large." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!isReportRequest(body)) {
    return Response.json(
      { error: "Please choose a reason, and check the email address if you added one." },
      { status: 400 }
    );
  }

  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!turnstileSecret || !supabaseUrl || !serviceRoleKey) {
    console.error("Review report server configuration is incomplete.");
    return Response.json({ error: UNAVAILABLE }, { status: 503 });
  }

  try {
    const turnstile = await verifyTurnstile({
      secret: turnstileSecret,
      token: body.turnstileToken,
      action: "review_report",
      allowedHostnames: originCheck.allowedHostnames,
    });
    if (!turnstile.ok) {
      return Response.json({ error: turnstile.error }, { status: turnstile.status });
    }

    const clientIp = getClientIp(request);
    if (!clientIp) {
      console.error("Could not determine client IP for report rate limiting.");
      return Response.json({ error: UNAVAILABLE }, { status: 503 });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: outcome, error } = await adminClient.rpc("submit_review_report", {
      p_review_id: body.reviewId,
      p_reason: body.reason,
      p_details: body.details?.trim() || null,
      p_contact_email: body.contactEmail?.trim() || null,
      p_ip_fingerprint: ipFingerprint(clientIp, serviceRoleKey),
    });

    if (error) {
      console.error("Supabase rejected a review report.", error.code);
      return Response.json(
        { error: "We couldn’t send your report. Please check the form and try again." },
        { status: 400 }
      );
    }

    if (outcome === "rate_limited") {
      return Response.json(
        { error: "Report limit reached. Please try again in about an hour." },
        { status: 429 }
      );
    }

    if (outcome === "not_found") {
      return Response.json(
        { error: "This review is no longer published, so there's nothing to report." },
        { status: 404 }
      );
    }

    // 'hidden': a legal-concern report, which takes the review down at once.
    return Response.json(
      { submitted: true, hidden: outcome === "hidden" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Review report failed.", error);
    return Response.json({ error: UNAVAILABLE }, { status: 503 });
  }
}

function isReportRequest(value: unknown): value is ReportRequest {
  if (!value || typeof value !== "object") {
    return false;
  }

  const body = value as Record<string, unknown>;
  return (
    typeof body.turnstileToken === "string" &&
    body.turnstileToken.length > 0 &&
    body.turnstileToken.length <= 2048 &&
    Number.isSafeInteger(body.reviewId) &&
    (body.reviewId as number) > 0 &&
    isReportReason(body.reason) &&
    (body.details === undefined ||
      (typeof body.details === "string" &&
        body.details.trim().length <= REPORT_DETAILS_LIMIT)) &&
    (body.contactEmail === undefined ||
      (typeof body.contactEmail === "string" &&
        (body.contactEmail.trim() === "" || looksLikeEmail(body.contactEmail.trim())))) &&
    // A legal concern hides the review at once, so it needs a way to reply
    // and an explanation.
    (!isLegalConcern(body.reason as string) ||
      (typeof body.contactEmail === "string" &&
        looksLikeEmail(body.contactEmail.trim()) &&
        typeof body.details === "string" &&
        body.details.trim().length >= LEGAL_CONCERN_MIN_DETAILS))
  );
}
