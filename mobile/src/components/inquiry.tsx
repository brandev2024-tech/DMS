import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useState } from "react";
import { TextInput, View } from "react-native";
import { logDmClick } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { startDirectAsk } from "@/lib/chat";
import { buildInquiryMessage, openInstagram, openMessenger, sharePhotoAndMessage } from "@/lib/dm";
import { productUrl } from "@/lib/env";
import { mainImage, priceLabel } from "@/lib/format";
import { useSettings } from "@/lib/hooks";
import { imageUrl } from "@/lib/images";
import { useColors } from "@/lib/theme";
import type { DmChannel, Product } from "@/lib/types";
import { Button } from "./ui/button";
import { Sheet } from "./ui/sheet";
import { Heading, Text } from "./ui/text";
import { useToast } from "./ui/toast";

const TITLES: Record<DmChannel, string> = { messenger: "Message on Messenger", instagram: "Message on Instagram", direct: "Direct Ask" };

/**
 * The inquiry sheet: product preview + an editable, pre-written message, then
 * Messenger / Instagram (copy + open app), "Share photo + message", or Direct Ask.
 */
export function InquirySheet({
  product,
  channel,
  size,
  color,
  onClose,
}: {
  product: Product;
  channel: DmChannel | null;
  size: string | null;
  color: string | null;
  onClose: () => void;
}) {
  const settings = useSettings();
  const { userId } = useAuth();
  const colors = useColors();
  const toast = useToast();
  const price = priceLabel(product, settings);
  const img = imageUrl(mainImage(product.images)?.r2_key);
  const link = productUrl(product.slug);
  const [message, setMessage] = useState("");
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);

  // Fresh message every time the sheet opens (with the current size/colour).
  const openKey = channel ? `${channel}|${size}|${color}|${price}` : null;
  const [seenKey, setSeenKey] = useState<string | null>(null);
  if (openKey !== seenKey) {
    setSeenKey(openKey);
    if (openKey) {
      setMessage(buildInquiryMessage({ productName: product.name, price, size, color, productUrl: link }));
      setQuestion("");
    }
  }

  const done = (msg: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    toast(msg);
    onClose();
  };

  const go = async () => {
    if (!channel) return;
    if (channel === "direct") {
      if (!userId) {
        onClose();
        router.push("/login?next=back");
        return;
      }
      setBusy(true);
      try {
        const id = await startDirectAsk({
          userId,
          productId: product.id,
          snapshot: { name: product.name, slug: product.slug, image: img, price, size, color },
          question,
        });
        logDmClick(product.id, "direct");
        done("Sent! We'll reply here soon 💕");
        router.push(`/messages/${id}`);
      } catch {
        toast("Couldn't send your message. Please try again.");
      } finally {
        setBusy(false);
      }
      return;
    }
    logDmClick(product.id, channel);
    try {
      if (channel === "messenger") {
        await openMessenger(settings, message);
        done("Message copied, just paste it if it doesn't appear!");
      } else {
        await openInstagram(settings, message);
        done("Inquiry copied! Paste it in our Instagram chat 💌");
      }
    } catch {
      toast("Couldn't open the app. Your message is copied — paste it in our chat.");
    }
  };

  const sharePhoto = async () => {
    if (!channel || channel === "direct") return;
    setBusy(true);
    logDmClick(product.id, channel);
    try {
      await sharePhotoAndMessage(img, message);
      toast("Message copied — paste it after the photo 💌");
      onClose();
    } catch {
      toast("Couldn't share the photo. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={channel !== null}
      onClose={onClose}
      title={channel ? TITLES[channel] : ""}
      footer={
        channel === "direct" ? (
          <Button
            title={userId ? "Send to DMS" : "Log in to send"}
            icon={userId ? "paper-plane-outline" : "log-in-outline"}
            loading={busy}
            onPress={go}
          />
        ) : (
          <View className="gap-2.5">
            <Button title={channel === "messenger" ? "Copy & open Messenger" : "Copy & open Instagram"} icon={channel === "messenger" ? "chatbubble-ellipses-outline" : "logo-instagram"} onPress={go} />
            <Button title="Share photo + message" icon="share-outline" variant="outline" loading={busy} onPress={sharePhoto} />
          </View>
        )
      }
    >
      <View className="mt-2 flex-row gap-3 rounded-2xl border border-line bg-surface p-3">
        <View className="h-20 w-16 overflow-hidden rounded-xl bg-blush">
          {img ? <Image source={img} alt={product.name} style={{ width: "100%", height: "100%" }} contentFit="cover" /> : null}
        </View>
        <View className="flex-1 justify-center">
          <Heading className="text-xl" numberOfLines={2}>
            {product.name}
          </Heading>
          <Text className="mt-0.5 font-medium text-[14px] text-rose-ink">{price ?? "May I know the price?"}</Text>
          {size || color ? (
            <Text className="mt-0.5 text-[12px] text-muted">{[size && `Size: ${size}`, color && `Color: ${color}`].filter(Boolean).join(" · ")}</Text>
          ) : null}
        </View>
      </View>

      {channel === "direct" ? (
        <>
          <Text className="mb-2 mt-5 font-medium text-[13px] text-muted">Your question</Text>
          <TextInput
            value={question}
            onChangeText={setQuestion}
            placeholder="e.g. Is this available in Small? How much is shipping to Manila?"
            placeholderTextColor={colors.muted}
            multiline
            textAlignVertical="top"
            className="min-h-[110px] rounded-2xl border border-line bg-surface px-4 py-3 font-sans text-[15px] text-ink"
          />
          <Text className="mt-2 text-[12px] text-muted">We&apos;ll send the product card first, then your question. Replies show up in Messages.</Text>
        </>
      ) : (
        <>
          <Text className="mb-2 mt-5 font-medium text-[13px] text-muted">Your message (you can edit it)</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            multiline
            textAlignVertical="top"
            className="min-h-[150px] rounded-2xl border border-line bg-surface px-4 py-3 font-sans text-[14px] leading-5 text-ink"
          />
          <Text className="mt-2 text-[12px] text-muted">
            We copy this for you. If it doesn&apos;t appear in the chat, just paste it. &quot;Share photo + message&quot; sends the actual picture.
          </Text>
        </>
      )}
    </Sheet>
  );
}
