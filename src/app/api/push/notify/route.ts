import { NextResponse, type NextRequest } from "next/server";
import { buildPushHTTPRequest } from "@pushforge/builder";
import { createRequestClient, createServiceClient } from "@/lib/supabase/server";

/**
 * Sends a web-push to the other side of a conversation after a new message.
 * Shopper → all admins; admin → that shopper. No-ops when push isn't configured.
 */
export async function POST(request: NextRequest) {
  // VAPID keys come from `npx @pushforge/builder vapid` (private key is a JWK JSON string).
  const { VAPID_PRIVATE_JWK, NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_SUBJECT } = process.env;
  const service = createServiceClient();
  if (!VAPID_PRIVATE_JWK || !NEXT_PUBLIC_VAPID_PUBLIC_KEY || !service) {
    return NextResponse.json({ sent: 0, reason: "push not configured" });
  }

  const { conversationId } = (await request.json().catch(() => ({}))) as { conversationId?: string };
  if (!conversationId) return NextResponse.json({ error: "conversationId required" }, { status: 400 });

  // Verify the caller is part of the conversation using their own (RLS-bound) session.
  const supabase = await createRequestClient(request);
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: convo } = await supabase.from("conversations").select("id, shopper_id, last_message").eq("id", conversationId).maybeSingle();
  if (!convo) return NextResponse.json({ error: "not found" }, { status: 404 });

  const senderIsShopper = convo.shopper_id === auth.user.id;
  let targetIds: string[];
  if (senderIsShopper) {
    const { data: admins } = await service.from("profiles").select("id").eq("role", "admin");
    targetIds = (admins ?? []).map((a) => a.id as string);
  } else {
    targetIds = [convo.shopper_id as string];
  }
  if (!targetIds.length) return NextResponse.json({ sent: 0 });

  const { data: subs } = await service.from("push_subscriptions").select("*").in("user_id", targetIds);
  if (!subs?.length) return NextResponse.json({ sent: 0 });

  const payload = {
    title: senderIsShopper ? "New Direct Ask 💌" : "DMS replied 💌",
    body: convo.last_message ?? "You have a new message",
    url: senderIsShopper ? `/admin/inbox?c=${conversationId}` : `/messages?c=${conversationId}`,
    tag: `conversation-${conversationId}`,
  };

  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        const req = await buildPushHTTPRequest({
          privateJWK: VAPID_PRIVATE_JWK,
          subscription: { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          message: { payload, adminContact: VAPID_SUBJECT || "mailto:hello@example.com", options: { ttl: 86400, urgency: "high" } },
        });
        const res = await fetch(req.endpoint, { method: "POST", headers: req.headers, body: req.body });
        if (res.ok) sent++;
        // Expired or unsubscribed: forget it.
        else if (res.status === 404 || res.status === 410) await service.from("push_subscriptions").delete().eq("id", s.id);
      } catch {
        // One bad subscription shouldn't stop the others.
      }
    }),
  );
  return NextResponse.json({ sent });
}
