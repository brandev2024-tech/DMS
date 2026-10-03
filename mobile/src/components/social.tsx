import * as Linking from "expo-linking";
import { Pressable, View } from "react-native";
import type { ShopSettings } from "@/lib/types";
import { Icon, type IconName } from "./ui/icon";
import { Text } from "./ui/text";

type Link = { label: string; url: string; icon: IconName };

/** The shop's enabled social links (same toggles as the website footer). */
export function socialLinks(s: ShopSettings): Link[] {
  const links: Link[] = [];
  if (s.facebook_enabled && s.facebook_url) links.push({ label: "Facebook", url: s.facebook_url, icon: "logo-facebook" });
  if (s.instagram_enabled && s.instagram_username)
    links.push({ label: "Instagram", url: `https://instagram.com/${s.instagram_username.replace(/^@/, "")}`, icon: "logo-instagram" });
  if (s.messenger_enabled && s.messenger_username)
    links.push({ label: "Messenger", url: `https://m.me/${s.messenger_username}`, icon: "chatbubble-ellipses-outline" });
  if (s.tiktok_enabled && s.tiktok_url) links.push({ label: "TikTok", url: s.tiktok_url, icon: "logo-tiktok" });
  for (const l of s.other_links ?? []) if (l.enabled && l.url) links.push({ label: l.label, url: l.url, icon: "link-outline" });
  return links;
}

export function SocialLinks({ settings }: { settings: ShopSettings }) {
  const links = socialLinks(settings);
  if (!links.length) return null;
  return (
    <View className="flex-row flex-wrap gap-2">
      {links.map((l) => (
        <Pressable
          key={l.label + l.url}
          accessibilityRole="link"
          onPress={() => Linking.openURL(l.url)}
          className="flex-row items-center gap-2 rounded-full border border-line bg-surface px-4 py-2.5 active:opacity-70"
        >
          <Icon name={l.icon} size={16} color="rose-ink" />
          <Text className="text-[13px]">{l.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}
