// Supabase Edge Function: push-message
//
// Called by a Database Webhook on INSERT into public.messages. Sends an Expo push
// notification to the other side of the chat:
//   • a shopper writes  → every admin's phones
//   • an admin replies  → that shopper's phones
// Tapping the notification opens the chat in the DMS app.
//
// Runs on Supabase's servers: the service role key is provided automatically and is
// never sent to the app. The webhook must send the header  x-webhook-secret: <PUSH_WEBHOOK_SECRET>.
// Deploy:  npx supabase functions deploy push-message --no-verify-jwt
import { createClient } from "npm:@supabase/supabase-js@2";

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  image_key: string | null;
  product_id: string | null;
  product_snapshot: { name?: string } | null;
};

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

Deno.serve(async (req) => {
  const secret = Deno.env.get("PUSH_WEBHOOK_SECRET");
  if (!secret || req.headers.get("x-webhook-secret") !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  const m = payload?.record as MessageRow | undefined;
  if (payload?.type !== "INSERT" || payload?.table !== "messages" || !m?.conversation_id) {
    return Response.json({ sent: 0, reason: "ignored" });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: convo } = await supabase
    .from("conversations")
    .select("id, shopper_id, shopper:profiles(full_name)")
    .eq("id", m.conversation_id)
    .maybeSingle();
  if (!convo) return Response.json({ sent: 0, reason: "no conversation" });

  const fromShopper = m.sender_id === convo.shopper_id;
  let targets: string[];
  if (fromShopper) {
    const { data: admins } = await supabase.from("profiles").select("id").eq("role", "admin");
    targets = (admins ?? []).map((a) => a.id as string);
  } else {
    targets = [convo.shopper_id as string];
  }
  targets = targets.filter((id) => id !== m.sender_id);
  if (!targets.length) return Response.json({ sent: 0 });

  const { data: tokens } = await supabase.from("push_tokens").select("token").in("user_id", targets);
  if (!tokens?.length) return Response.json({ sent: 0 });

  const shopper = (convo.shopper as { full_name?: string | null } | null)?.full_name || "A shopper";
  const preview =
    m.body?.slice(0, 140) ||
    (m.image_key ? "📷 Photo" : m.product_snapshot?.name ? `🛍️ Asked about ${m.product_snapshot.name}` : "New message");

  const messages = tokens.map(({ token }) => ({
    to: token,
    title: fromShopper ? `${shopper} · Direct Ask 💌` : "DMS replied 💌",
    body: preview,
    sound: "default",
    channelId: "messages",
    priority: "high",
    // Same route for shoppers and admins; the chat screen adapts to who opens it.
    data: { url: `/messages/${m.conversation_id}`, conversationId: m.conversation_id },
  }));

  let sent = 0;
  const stale: string[] = [];
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(chunk),
    });
    const json = await res.json().catch(() => ({}));
    (json.data ?? []).forEach((ticket: { status: string; details?: { error?: string } }, j: number) => {
      if (ticket.status === "ok") sent++;
      // The app was uninstalled or notifications were turned off: forget the token.
      else if (ticket.details?.error === "DeviceNotRegistered") stale.push(chunk[j].to);
    });
  }
  if (stale.length) await supabase.from("push_tokens").delete().in("token", stale);

  return Response.json({ sent, removed: stale.length });
});
