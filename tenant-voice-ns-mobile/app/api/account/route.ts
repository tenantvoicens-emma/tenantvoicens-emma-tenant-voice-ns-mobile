import { createClient } from "@supabase/supabase-js";
import { isModeratorEmail } from "@/lib/moderator";
import { checkRequestOrigin } from "@/lib/server/request-origin";

// Deletes the signed-in renter's account. Reviews they wrote stay
// published (they were always anonymous), but the private link between
// each review and the account is removed with it (ON DELETE CASCADE).
export async function DELETE(request: Request) {
  if (!checkRequestOrigin(request).ok) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const accessToken = request.headers
    .get("authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) {
    return Response.json({ error: "Please sign in again." }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    console.error("Account deletion server configuration is incomplete.");
    return Response.json(
      { error: "Account deletion is temporarily unavailable." },
      { status: 503 }
    );
  }

  const clientOptions = {
    auth: { autoRefreshToken: false, persistSession: false },
  };

  try {
    const authClient = createClient(supabaseUrl, supabaseAnonKey, clientOptions);
    const { data, error } = await authClient.auth.getUser(accessToken);
    if (error || !data.user) {
      return Response.json(
        { error: "Your sign-in expired. Please sign in again and retry." },
        { status: 401 }
      );
    }

    // Deleting the moderator account would lock everyone out of
    // moderation, so it has to be done deliberately in Supabase.
    if (isModeratorEmail(data.user.email)) {
      return Response.json(
        { error: "The moderator account can't be deleted from the site." },
        { status: 403 }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, clientOptions);
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(
      data.user.id
    );
    if (deleteError) {
      console.error("Supabase could not delete an account.", deleteError.code);
      return Response.json(
        { error: "We couldn't delete your account. Please try again." },
        { status: 500 }
      );
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Account deletion failed.", error);
    return Response.json(
      { error: "Account deletion is temporarily unavailable." },
      { status: 503 }
    );
  }
}
