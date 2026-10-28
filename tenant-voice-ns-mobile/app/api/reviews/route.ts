import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { createClient } from "@supabase/supabase-js";

const propertyRatingCategories = new Set([
  "cleanliness",
  "safety",
  "common_areas",
  "noise_levels",
  "parking",
  "amenities",
  "building_condition",
  "pet_friendliness",
]);

const landlordRatingCategories = new Set([
  "communication",
  "repair_speed",
  "professionalism",
  "lease_transparency",
  "move_in_experience",
]);

const occupancyDurations = new Set([
  "less_than_1_year",
  "1_to_3_years",
  "4_to_6_years",
  "7_to_10_years",
  "more_than_10_years",
]);

type RatingInput = {
  category: string;
  score: string;
};

// A building the renter couldn't find, added when they review it. It
// stays hidden until the moderator approves the review.
type NewPropertyInput = {
  address: string;
  city: string;
  name?: string;
  hasFourOrMoreUnits: true;
};

type ReviewRequest = {
  turnstileToken: string;
  propertyId?: number;
  newProperty?: NewPropertyInput;
  reviewText: string;
  occupancyDuration: string;
  wouldLiveAgain: string;
  propertyRatings: RatingInput[];
  landlordRatings: RatingInput[];
};

export async function POST(request: Request) {
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
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const isAllowedOrigin = configuredOrigins.length > 0
    ? configuredOrigins.includes(requestOrigin.origin)
    : requestOrigin.origin === requestUrl.origin;

  if (!isAllowedOrigin) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
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

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 20_000) {
    return Response.json({ error: "Review is too large." }, { status: 413 });
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  if (new TextEncoder().encode(rawBody).byteLength > 20_000) {
    return Response.json({ error: "Review is too large." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!isReviewRequest(body)) {
    return Response.json({ error: "Please check the review fields." }, { status: 400 });
  }

  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!turnstileSecret || !supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    console.error("Review submission server configuration is incomplete.");
    return Response.json(
      { error: "Review submission is temporarily unavailable." },
      { status: 503 }
    );
  }

  const authorization = request.headers.get("authorization");
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;
  if (authorization && !accessToken) {
    return Response.json({ error: "Invalid sign-in session." }, { status: 401 });
  }

  const verificationBody = new URLSearchParams({
    secret: turnstileSecret,
    response: body.turnstileToken,
  });

  try {
    let userId: string | null = null;

    if (accessToken) {
      const authClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
      const { data, error } = await authClient.auth.getUser(accessToken);

      if (error || !data.user) {
        return Response.json(
          { error: "Your sign-in expired. Please sign in again and retry." },
          { status: 401 }
        );
      }

      userId = data.user.id;
    }

    const verificationResponse = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: verificationBody,
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
        "Turnstile rejected a review submission.",
        verification["error-codes"] ?? []
      );
      return Response.json(
        { error: "The security check could not be verified. Please try again." },
        { status: 400 }
      );
    }

    if (verification.action !== "review_submit") {
      console.warn("Turnstile review action did not match.");
      return Response.json(
        { error: "The security check did not match this form. Please refresh and try again." },
        { status: 400 }
      );
    }

    if (
      !verification.hostname ||
      !allowedHostnames.includes(verification.hostname.toLowerCase())
    ) {
      console.warn("Turnstile hostname did not match the allowed request origin.");
      return Response.json(
        { error: "The security check did not match this site. Please refresh and try again." },
        { status: 400 }
      );
    }

    const clientIp = getClientIp(request);
    if (!clientIp) {
      console.error("Could not determine client IP for review rate limiting.");
      return Response.json(
        { error: "Review submission is temporarily unavailable." },
        { status: 503 }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const ipFingerprint = createHmac("sha256", serviceRoleKey)
      .update(clientIp)
      .digest("hex");
    const { data: isWithinRateLimit, error: rateLimitError } =
      await adminClient.rpc("consume_review_submission_limit", {
        p_ip_fingerprint: ipFingerprint,
      });

    if (rateLimitError) {
      console.error("Review rate-limit check failed.", rateLimitError.code);
      return Response.json(
        { error: "Review submission is temporarily unavailable." },
        { status: 503 }
      );
    }

    if (!isWithinRateLimit) {
      return Response.json(
        { error: "Submission limit reached. Please try again in about an hour." },
        { status: 429 }
      );
    }

    let propertyId = body.propertyId;
    if (body.newProperty) {
      const { data: suggestedId, error: suggestError } = await adminClient.rpc(
        "find_or_suggest_property",
        {
          p_address: body.newProperty.address,
          p_city: body.newProperty.city,
          p_name: body.newProperty.name ?? null,
        }
      );
      if (suggestError || typeof suggestedId !== "number") {
        console.error("Supabase rejected a suggested building.", suggestError?.code);
        return Response.json(
          { error: "Please check the building's address and town." },
          { status: 400 }
        );
      }
      propertyId = suggestedId;
    }

    const { error } = await adminClient.rpc("submit_review", {
      p_property_id: propertyId,
      p_review_text: body.reviewText.trim(),
      p_occupancy_duration: body.occupancyDuration,
      p_would_live_again: body.wouldLiveAgain,
      p_property_ratings: body.propertyRatings,
      p_landlord_ratings: body.landlordRatings,
      p_user_id: userId,
    });

    if (error) {
      console.error("Supabase rejected a review submission.", error.code);
      return Response.json(
        { error: "We couldn’t submit your review. Please check your answers." },
        { status: 400 }
      );
    }

    return Response.json({ submitted: true }, { status: 201 });
  } catch (error) {
    console.error("Review submission verification failed.", error);
    return Response.json(
      { error: "Review submission is temporarily unavailable." },
      { status: 503 }
    );
  }
}

function isReviewRequest(value: unknown): value is ReviewRequest {
  if (!value || typeof value !== "object") {
    return false;
  }

  const body = value as Record<string, unknown>;
  return (
    typeof body.turnstileToken === "string" &&
    body.turnstileToken.length > 0 &&
    body.turnstileToken.length <= 2048 &&
    // Exactly one of: an existing property, or a new one to add.
    (body.newProperty === undefined
      ? Number.isSafeInteger(body.propertyId) && (body.propertyId as number) > 0
      : body.propertyId === undefined && isNewProperty(body.newProperty)) &&
    typeof body.reviewText === "string" &&
    body.reviewText.trim().length > 0 &&
    body.reviewText.length <= 5000 &&
    typeof body.occupancyDuration === "string" &&
    occupancyDurations.has(body.occupancyDuration) &&
    ["yes", "no", "unsure"].includes(String(body.wouldLiveAgain)) &&
    isRatingArray(body.propertyRatings, propertyRatingCategories) &&
    isRatingArray(body.landlordRatings, landlordRatingCategories)
  );
}

function isNewProperty(value: unknown): value is NewPropertyInput {
  if (!value || typeof value !== "object") {
    return false;
  }

  const input = value as Record<string, unknown>;
  return (
    typeof input.address === "string" &&
    /^\s*\d/.test(input.address) &&
    input.address.trim().length >= 3 &&
    input.address.length <= 120 &&
    typeof input.city === "string" &&
    input.city.trim().length >= 2 &&
    input.city.length <= 60 &&
    (input.name === undefined ||
      (typeof input.name === "string" && input.name.length <= 80)) &&
    input.hasFourOrMoreUnits === true
  );
}

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const candidates = [
    request.headers.get("cf-connecting-ip"),
    request.headers.get("x-vercel-forwarded-for"),
    forwardedFor?.split(",")[0],
    request.headers.get("x-real-ip"),
  ];

  return candidates
    .map((candidate) => candidate?.trim())
    .find((candidate): candidate is string => Boolean(candidate && isIP(candidate)));
}

function isRatingArray(
  value: unknown,
  categories: Set<string>
): value is RatingInput[] {
  if (!Array.isArray(value)) {
    return false;
  }

  if (value.length > categories.size) {
    return false;
  }

  const seenCategories = new Set<string>();
  return value.every((rating: unknown) => {
    if (!rating || typeof rating !== "object") {
      return false;
    }

    const input = rating as Record<string, unknown>;
    if (
      typeof input.category !== "string" ||
      !categories.has(input.category) ||
      seenCategories.has(input.category) ||
      typeof input.score !== "string" ||
      !["na", "1", "2", "3", "4", "5"].includes(input.score)
    ) {
      return false;
    }

    seenCategories.add(input.category);
    return true;
  });
}