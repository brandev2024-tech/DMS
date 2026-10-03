/**
 * Images are stored in Cloudflare R2; the database only keeps the object key.
 * - "demo/…"         → bundled sample photos in /public/demo
 * - "/…" or "http…"  → used as-is
 * - anything else    → NEXT_PUBLIC_R2_PUBLIC_URL + "/" + key
 * Uploaded photos get a small "_thumb.webp" sibling for cards and lists.
 */
const R2_PUBLIC_URL = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "").replace(/\/$/, "");

export function imageUrl(key: string | null | undefined, size: "full" | "thumb" = "full") {
  if (!key) return null;
  if (/^https?:\/\//i.test(key) || key.startsWith("/")) return key;
  const k = size === "thumb" ? thumbKey(key) : key;
  if (k.startsWith("demo/")) return `/${k}`;
  return R2_PUBLIC_URL ? `${R2_PUBLIC_URL}/${k}` : `/${k}`;
}

/** "products/abc.webp" → "products/abc_thumb.webp" (chat & branding photos have no thumbnail). */
export function thumbKey(key: string) {
  if (key.startsWith("chat/") || key.startsWith("branding/") || /_thumb\.\w+$/.test(key)) return key;
  return key.replace(/\.(webp|jpg|png)$/, "_thumb.$1");
}
