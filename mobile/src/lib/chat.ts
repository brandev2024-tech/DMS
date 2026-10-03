import { supabase } from "./supabase";
import type { Message, ProductSnapshot } from "./types";

/**
 * Opens the shopper's current conversation (or starts one), then posts the product
 * card followed by their question. Same behaviour as the website's Direct Ask.
 */
export async function startDirectAsk(opts: { userId: string; productId: string; snapshot: ProductSnapshot; question: string }) {
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("shopper_id", opts.userId)
    .neq("status", "archived")
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let conversationId = existing?.id as string | undefined;
  if (!conversationId) {
    const { data, error } = await supabase.from("conversations").insert({ shopper_id: opts.userId }).select("id").single();
    if (error) throw error;
    conversationId = data.id as string;
  }

  const { error: cardError } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: opts.userId,
    product_id: opts.productId,
    product_snapshot: opts.snapshot,
  });
  if (cardError) throw cardError;

  if (opts.question.trim()) {
    const { error } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: opts.userId, body: opts.question.trim() });
    if (error) throw error;
  }
  return conversationId;
}

/** The shopper's open conversation, creating one when they have none. */
export async function ensureConversation(userId: string) {
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("shopper_id", userId)
    .neq("status", "archived")
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) return existing.id as string;
  const { data, error } = await supabase.from("conversations").insert({ shopper_id: userId }).select("id").single();
  if (error) throw error;
  return data.id as string;
}

export async function sendMessage(conversationId: string, senderId: string, content: { body?: string; image_key?: string }) {
  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, ...content })
    .select("*")
    .single();
  if (error) throw error;
  return data as Message;
}

export function markRead(conversationId: string) {
  return supabase.rpc("mark_conversation_read", { p_conversation: conversationId });
}
