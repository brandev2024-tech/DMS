// Supabase Edge Function: delete-account
//
// "Delete my account" in the DMS app (required by Apple and Google). Deletes the
// signed-in user; the database cascades remove their profile, favorites, push
// tokens, Direct Ask conversations and messages.
//
// The caller is identified from their own access token. The service role key is
// provided to the function by Supabase and never leaves the server.
// The token is checked here (getUser), so it is deployed with --no-verify-jwt, which also
// works with Supabase's newer JWT signing keys.
// Deploy:  npx supabase functions deploy delete-account --no-verify-jwt
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405, headers: cors });

  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ error: "Please log in first." }, { status: 401, headers: cors });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) return Response.json({ error: "Your session has expired. Please log in again." }, { status: 401, headers: cors });

  // Protect the shop: an admin account must be demoted (in the SQL editor) before it can be deleted.
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role === "admin") {
    return Response.json({ error: "Admin accounts can't be deleted from the app. Remove the admin role first." }, { status: 403, headers: cors });
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return Response.json({ error: "Couldn't delete your account. Please try again." }, { status: 500, headers: cors });

  return Response.json({ deleted: true }, { headers: cors });
});
