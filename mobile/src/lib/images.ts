import { API_URL, R2_PUBLIC_URL } from "./env";

/**
 * Same rules as the website: the database stores the R2 object key.
 * - "demo/…"         → the website's bundled sample photos
 * - "http…"          → used as-is
 * - anything else    → R2 public URL + "/" + key
 * Uploaded catalog photos have a "_thumb" sibling for cards and lists.
 */
export function imageUrl(key: string | null | undefined, size: "full" | "thumb" = "full") {
  if (!key) return null;
  if (/^https?:\/\//i.test(key)) return key;
  const k = size === "thumb" ? thumbKey(key) : key;
  if (k.startsWith("demo/") || k.startsWith("/")) return `${API_URL}/${k.replace(/^\//, "")}`;
  return `${R2_PUBLIC_URL}/${k}`;
}

export function thumbKey(key: string) {
  if (key.startsWith("chat/") || key.startsWith("branding/") || /_thumb\.\w+$/.test(key)) return key;
  return key.replace(/\.(webp|jpg|png)$/, "_thumb.$1");
}
