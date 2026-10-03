"use client";

import { createClient } from "./supabase/client";
import { isSupabaseConfigured } from "./supabase/config";
import type { ProductSnapshot } from "./types";

/**
 * Opens the shopper's current conversation (or starts one), then posts the
 * product card followed by their question. Returns the conversation id.
 */
export async function startDirectAsk(opts: {
  userId: string;
  productId: string;
  snapshot: ProductSnapshot;
  question: string;
}) {
  const supabase = createClient();

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
    const { data, error } = await supabase
      .from("conversations")
      .insert({ shopper_id: opts.userId })
      .select("id")
      .single();
    if (error) throw error;
    conversationId = data.id as string;
  }

  // Insert sequentially so the product card always lands before the question.
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

  notifyPush(conversationId);
  return conversationId;
}

/** Fire-and-forget: asks the server to send a web-push to the other side. */
export function notifyPush(conversationId: string) {
  fetch("/api/push/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversationId }),
  }).catch(() => {});
}

export function logDmClick(productId: string | null, channel: "messenger" | "instagram" | "direct") {
  if (!isSupabaseConfigured) return; // demo mode: nothing to log to
  createClient()
    .from("dm_clicks")
    .insert({ product_id: productId, channel })
    .then(() => {});
}

/** Resize + re-encode an image in the browser (WebP, or JPEG where WebP encoding isn't supported). */
export async function compressImage(file: File, maxSize = 1600, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error("That file doesn't look like an image.");
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const encode = (type: string) => new Promise<Blob | null>((res) => canvas.toBlob(res, type, quality));
  const webp = await encode("image/webp");
  // Safari silently returns PNG for WebP requests; JPEG is much smaller then.
  if (webp?.type === "image/webp") return webp;
  const jpeg = await encode("image/jpeg");
  if (!jpeg) throw new Error("Couldn't process that image.");
  return jpeg;
}

export type UploadKind = "product" | "category" | "branding" | "chat";

/**
 * Compresses the photo (max 1600px, plus a 600px thumbnail for catalog images),
 * asks the server for presigned R2 URLs, uploads straight to R2 and returns the key.
 */
export async function uploadImage(kind: UploadKind, file: File, maxSize = 1600): Promise<string> {
  const withThumb = kind === "product" || kind === "category";
  const blobs = [await compressImage(file, maxSize)];
  if (withThumb) blobs.push(await compressImage(file, 600, 0.78));

  const res = await fetch("/api/uploads/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind,
      files: blobs.map((b, i) => ({ contentType: b.type, size: b.size, variant: i === 0 ? "full" : "thumb" })),
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { uploads?: { key: string; url: string; contentType: string }[]; error?: string };
  if (!res.ok || !data.uploads) throw new Error(data.error ?? "Upload failed.");

  await Promise.all(
    data.uploads.map(async (u, i) => {
      const put = await fetch(u.url, { method: "PUT", headers: { "Content-Type": u.contentType }, body: blobs[i] });
      if (!put.ok) throw new Error("Upload to storage failed. Check the R2 bucket CORS settings.");
    }),
  );
  return data.uploads[0].key;
}

/** Admin: remove photos from R2 that are no longer used (best effort). */
export function deleteImages(keys: string[]) {
  const own = keys.filter((k) => !k.startsWith("demo/"));
  if (!own.length) return;
  fetch("/api/uploads/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keys: own }),
  }).catch(() => {});
}
