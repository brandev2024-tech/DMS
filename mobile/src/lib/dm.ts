import * as Clipboard from "expo-clipboard";
import { File, Paths } from "expo-file-system";
import * as Linking from "expo-linking";
import * as Sharing from "expo-sharing";
import { Platform, Share } from "react-native";
import type { ShopSettings } from "./types";

export type InquiryInput = {
  productName: string;
  price: string | null;
  size?: string | null;
  color?: string | null;
  productUrl: string;
  question?: string;
};

/** The editable pre-filled message (same wording as the website). */
export function buildInquiryMessage(i: InquiryInput) {
  const options = [i.size && `Size: ${i.size}`, i.color && `Color: ${i.color}`].filter(Boolean);
  return [
    `Hi DMS! 💕 I'm interested in ${i.productName}${options.length ? ` (${options.join(", ")})` : ""}.`,
    i.price ? `Price: ${i.price}` : "May I know the price?",
    `Product link: ${i.productUrl}`,
    `My question: ${i.question ?? ""}`,
  ].join("\n");
}

export const hasMessenger = (s: ShopSettings) => s.messenger_enabled && Boolean(s.messenger_username?.trim());
export const hasInstagram = (s: ShopSettings) => s.instagram_enabled && Boolean(s.instagram_username?.trim());
const igUser = (s: ShopSettings) => (s.instagram_username ?? "").trim().replace(/^@/, "");

/** Copies the message, then opens Messenger (app if installed, otherwise the browser). */
export async function openMessenger(s: ShopSettings, message: string) {
  await Clipboard.setStringAsync(message);
  const user = encodeURIComponent((s.messenger_username ?? "").trim());
  await Linking.openURL(`https://m.me/${user}?text=${encodeURIComponent(message)}`);
}

/** Copies the message, then opens the Instagram DM → profile in the app → browser. */
export async function openInstagram(s: ShopSettings, message: string) {
  await Clipboard.setStringAsync(message);
  const user = encodeURIComponent(igUser(s));
  const attempts = [`https://ig.me/m/${user}`, `instagram://user?username=${user}`, `https://instagram.com/${user}`];
  for (const url of attempts) {
    try {
      await Linking.openURL(url);
      return;
    } catch {
      // try the next one
    }
  }
}

/**
 * App-only: downloads the product photo and opens the share sheet with the image, so
 * the shopper can pick Messenger or Instagram and the real picture is sent.
 * The message is copied too, since some apps drop the text when sharing an image.
 */
export async function sharePhotoAndMessage(imageUrl: string | null, message: string) {
  await Clipboard.setStringAsync(message);
  if (!imageUrl || !(await Sharing.isAvailableAsync())) {
    await Share.share({ message });
    return;
  }
  const ext = imageUrl.match(/\.(webp|jpe?g|png)(?:\?|$)/i)?.[1]?.toLowerCase() ?? "jpg";
  const dest = new File(Paths.cache, `dms-inquiry-${Date.now()}.${ext}`);
  const file = await File.downloadFileAsync(imageUrl, dest);
  const mimeType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  if (Platform.OS === "ios") {
    // iOS share sheet takes the image plus the text together.
    await Share.share({ url: file.uri, message });
  } else {
    await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: "Send photo to DMS" });
  }
}
