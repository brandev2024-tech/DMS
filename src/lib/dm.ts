import type { ShopSettings } from "./types";

export type InquiryInput = {
  productName: string;
  price: string | null;
  size?: string | null;
  color?: string | null;
  productUrl: string;
  imageUrl: string | null;
  question?: string;
};

/** The editable pre-filled message shown in the "Your Inquiry" modal. */
export function buildInquiryMessage(i: InquiryInput) {
  const options = [i.size && `Size: ${i.size}`, i.color && `Color: ${i.color}`].filter(Boolean);
  const lines = [
    `Hi DMS! 💕 I'm interested in ${i.productName}${options.length ? ` (${options.join(", ")})` : ""}.`,
    i.price ? `Price: ${i.price}` : "May I know the price?",
    `Product link: ${i.productUrl}`,
  ];
  if (i.imageUrl) lines.push(`Photo: ${i.imageUrl}`);
  lines.push(`My question: ${i.question ?? ""}`);
  return lines.join("\n");
}

export function messengerUrl(username: string, text: string) {
  return `https://m.me/${encodeURIComponent(username)}?text=${encodeURIComponent(text)}`;
}

export function instagramDmUrl(username: string) {
  return `https://ig.me/m/${encodeURIComponent(username.replace(/^@/, ""))}`;
}

export function instagramProfileUrl(username: string) {
  return `https://instagram.com/${encodeURIComponent(username.replace(/^@/, ""))}`;
}

export function hasMessenger(s: ShopSettings) {
  return s.messenger_enabled && Boolean(s.messenger_username?.trim());
}

export function hasInstagram(s: ShopSettings) {
  return s.instagram_enabled && Boolean(s.instagram_username?.trim());
}

export async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers / non-secure contexts.
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}
