import { createClient } from "@supabase/supabase-js";
import {
  isLandlordOnSite,
  isRentalKind,
  type LandlordOnSite,
  type RentalKind,
} from "@/lib/rental-kind";
import { expandStreetType } from "@/lib/street-address";
import {
  getClientIp,
  ipFingerprint,
  verifyTurnstile,
} from "@/lib/server/form-security";
import { checkRequestOrigin } from "@/lib/server/request-origin";

const propertyRatingCategories = new Set([
  "overall",
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
  "overall",
  "communication",
  "repair_speed",
  "professionalism",
  "lease_transparency",
  "move_in_experience",
  "privacy",
  "deposit_handling",
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

// A property the renter couldn't find, added when they review it. It
// stays hidden until the moderator approves the review.
type NewPropertyInput = {
  address: string;
  city: string;
  name?: string;
  rentalKind?: RentalKind;
  // Sent instead of rentalKind by review forms opened before November 4,
  // 2026, which asked the renter to confirm the building had 4+ units.
  hasFourOrMoreUnits?: true;
};

type ReviewRequest = {
  turnstileToken: string;
  propertyId?: number;
  newProperty?: NewPropertyInput;
  reviewText: string;
  occupancyDuration: string;
  wouldLiveAgain: string;
  landlordOnSite?: LandlordOnSite;
  propertyRatings: RatingInput[];
  landlordRatings: RatingInput[];
};

export async function POST(request: Request) {
  const originCheck = checkRequestOrigin(request);
  if (!originCheck.ok) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const { allowedHostnames } = originCheck;

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

    const turnstile = await verifyTurnstile({
      secret: turnstileSecret,
      token: body.turnstileToken,
      action: "review_submit",
      allowedHostnames,
    });
    if (!turnstile.ok) {
      return Response.json({ error: turnstile.error }, { status: turnstile.status });
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

    const { data: isWithinRateLimit, error: rateLimitError } =
      await adminClient.rpc("consume_review_submission_limit", {
        p_ip_fingerprint: ipFingerprint(clientIp, serviceRoleKey),
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
          // "70 Ochterloney St" is saved as "70 Ochterloney Street", like
          // the registry's buildings.
          p_address: expandStreetType(body.newProperty.address),
          p_city: body.newProperty.city,
          p_name: body.newProperty.name ?? null,
          p_rental_kind:
            body.newProperty.rentalKind ??
            (body.newProperty.hasFourOrMoreUnits ? "building" : null),
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
      p_landlord_on_site: body.landlordOnSite ?? null,
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
    (body.landlordOnSite === undefined || isLandlordOnSite(body.landlordOnSite)) &&
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
    (isRentalKind(input.rentalKind) ||
      (input.rentalKind === undefined && input.hasFourOrMoreUnits === true))
  );
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