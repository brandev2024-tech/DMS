import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SinglePhoto, TagInput } from "@/components/admin";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Card, Row, Toggle } from "@/components/ui/misc";
import { Eyebrow, Heading, Text } from "@/components/ui/text";
import { useToast } from "@/components/ui/toast";
import { qk } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useSettings } from "@/lib/hooks";
import { imageUrl } from "@/lib/images";
import { signOut } from "@/lib/push";
import { supabase } from "@/lib/supabase";
import type { ShopSettings } from "@/lib/types";
import { deleteImages } from "@/lib/upload";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-3">
      <Eyebrow className="mt-4">{title}</Eyebrow>
      <Card className="gap-4">{children}</Card>
    </View>
  );
}

export default function AdminSettings() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { setMode, email } = useAuth();
  const current = useSettings();
  // Shows the saved settings until the admin starts editing.
  const [draft, setDraft] = useState<ShopSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const dirty = draft !== null;
  const s = draft ?? current;

  const set = <K extends keyof ShopSettings>(k: K, v: ShopSettings[K]) => setDraft((prev) => ({ ...(prev ?? current), [k]: v }));
  const text = (k: keyof ShopSettings) => ({ value: (s[k] as string | null) ?? "", onChangeText: (v: string) => set(k, v as never) });

  const save = async () => {
    setSaving(true);
    const blank = (v: string | null) => (v?.trim() ? v.trim() : null);
    const row = {
      shop_name: s.shop_name.trim() || "DMS",
      tagline: s.tagline.trim(),
      logo_key: s.logo_key,
      hero_image_key: s.hero_image_key,
      hero_headline: s.hero_headline.trim(),
      hero_subtext: blank(s.hero_subtext),
      facebook_url: blank(s.facebook_url),
      facebook_enabled: s.facebook_enabled,
      messenger_username: blank(s.messenger_username),
      messenger_enabled: s.messenger_enabled,
      instagram_username: blank(s.instagram_username)?.replace(/^@/, "") ?? null,
      instagram_enabled: s.instagram_enabled,
      tiktok_url: blank(s.tiktok_url),
      tiktok_enabled: s.tiktok_enabled,
      other_links: s.other_links.filter((l) => l.url.trim()),
      phone: blank(s.phone),
      email: blank(s.email),
      hours: blank(s.hours),
      location: blank(s.location),
      how_to_order: blank(s.how_to_order),
      payment_notes: blank(s.payment_notes),
      shipping_notes: blank(s.shipping_notes),
      quick_replies: s.quick_replies,
      couriers: s.couriers,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("shop_settings").upsert({ id: 1, ...row });
    setSaving(false);
    if (error) return Alert.alert("Not saved", error.message);
    // Old logo / banner photos are no longer used.
    deleteImages([current.logo_key, current.hero_image_key].filter((k): k is string => Boolean(k) && k !== s.logo_key && k !== s.hero_image_key));
    setDraft(null);
    toast("Settings saved — the website updates too ✨");
    queryClient.invalidateQueries({ queryKey: qk.settings });
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-bg" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 120 }} contentContainerClassName="px-5" keyboardShouldPersistTaps="handled">
        <Heading>Settings</Heading>
        <Text className="mt-1 text-[13px] text-muted">Changes here show on the app and the website.</Text>

        <Section title="Shop">
          <Input label="Shop name" {...text("shop_name")} />
          <Input label="Tagline" {...text("tagline")} />
          <SinglePhoto label="Logo" uri={imageUrl(s.logo_key)} kind="branding" onChange={(k) => set("logo_key", k)} aspect={2} />
        </Section>

        <Section title="Home banner">
          <SinglePhoto label="Hero banner photo" uri={imageUrl(s.hero_image_key)} kind="branding" onChange={(k) => set("hero_image_key", k)} aspect={4 / 5} />
          <Input label="Headline" {...text("hero_headline")} />
          <Input label="Subtext" {...text("hero_subtext")} multiline />
        </Section>

        <Section title="Social media">
          <Input label="Facebook page URL" {...text("facebook_url")} autoCapitalize="none" keyboardType="url" placeholder="https://facebook.com/DMSPHIL" />
          <Toggle label="Show Facebook" value={s.facebook_enabled} onChange={(v) => set("facebook_enabled", v)} />
          <Input label="Messenger username" {...text("messenger_username")} autoCapitalize="none" hint="The part after m.me/ — e.g. DMSPHIL" />
          <Toggle label="Messenger button" value={s.messenger_enabled} onChange={(v) => set("messenger_enabled", v)} />
          <Input label="Instagram username" {...text("instagram_username")} autoCapitalize="none" placeholder="dmsphil" />
          <Toggle label="Instagram button" value={s.instagram_enabled} onChange={(v) => set("instagram_enabled", v)} />
          <Input label="TikTok URL" {...text("tiktok_url")} autoCapitalize="none" keyboardType="url" />
          <Toggle label="Show TikTok" value={s.tiktok_enabled} onChange={(v) => set("tiktok_enabled", v)} />
          <Text className="font-medium text-[13px] text-muted">Other links (Shopee, Lazada…)</Text>
          {s.other_links.map((l, i) => (
            <View key={i} className="gap-2 rounded-2xl bg-blush/60 p-3">
              <View className="flex-row gap-2">
                <Input className="flex-1" placeholder="Label" value={l.label} onChangeText={(v) => set("other_links", s.other_links.map((x, j) => (j === i ? { ...x, label: v } : x)))} />
                <Pressable accessibilityLabel="Remove link" onPress={() => set("other_links", s.other_links.filter((_, j) => j !== i))} className="h-12 w-10 items-center justify-center">
                  <Icon name="trash-outline" size={18} color="#ef4444" />
                </Pressable>
              </View>
              <Input placeholder="https://…" autoCapitalize="none" keyboardType="url" value={l.url} onChangeText={(v) => set("other_links", s.other_links.map((x, j) => (j === i ? { ...x, url: v } : x)))} />
              <Toggle label="Show" value={l.enabled} onChange={(v) => set("other_links", s.other_links.map((x, j) => (j === i ? { ...x, enabled: v } : x)))} />
            </View>
          ))}
          <Button title="Add link" icon="add" variant="outline" small onPress={() => set("other_links", [...s.other_links, { label: "", url: "", enabled: true }])} />
        </Section>

        <Section title="Contact">
          <Input label="Phone" {...text("phone")} keyboardType="phone-pad" />
          <Input label="Email" {...text("email")} autoCapitalize="none" keyboardType="email-address" />
          <Input label="Business hours" {...text("hours")} placeholder="Mon–Sat, 10AM–7PM" />
          <Input label="Location" {...text("location")} placeholder="Baguio City" />
        </Section>

        <Section title="Ordering, payment & shipping">
          <Input label="How to order" {...text("how_to_order")} multiline />
          <Input label="Payment notes" {...text("payment_notes")} multiline placeholder="GCash, Maya, bank transfer, COD…" />
          <Input label="Shipping notes" {...text("shipping_notes")} multiline />
          <TagInput label="Couriers" values={s.couriers} onChange={(v) => set("couriers", v)} suggestions={["J&T Express", "LBC"]} />
        </Section>

        <Section title="Inbox quick replies">
          <TagInput label="Quick replies" values={s.quick_replies} onChange={(v) => set("quick_replies", v)} />
          <Text className="text-[12px] text-muted">Tap one in a chat to insert it.</Text>
        </Section>

        <View className="mt-8">
          <Eyebrow className="mb-1">App</Eyebrow>
          <Row icon="storefront-outline" label="Switch to Shop" detail="See the app as shoppers do" onPress={() => {
              setMode("shop");
              router.replace("/");
            }}
          />
          <Row icon="notifications-outline" label="Notifications" detail="New Direct Ask messages" onPress={() => router.push("/notifications")} />
          <Row icon="log-out-outline" label="Log out" detail={email} onPress={() => signOut()} />
        </View>
      </ScrollView>

      {dirty ? (
        <View className="absolute bottom-0 left-0 right-0 border-t border-line bg-bg px-5 py-3">
          <Button title="Save settings" loading={saving} onPress={save} />
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}
