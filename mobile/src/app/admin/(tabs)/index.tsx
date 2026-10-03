import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, type IconName } from "@/components/ui/icon";
import { Card } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/skeleton";
import { Eyebrow, Heading, Text } from "@/components/ui/text";
import { qk } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { useColors } from "@/lib/theme";

const CHANNELS = [
  { key: "messenger", label: "Messenger", icon: "chatbubble-ellipses-outline" },
  { key: "instagram", label: "Instagram", icon: "logo-instagram" },
  { key: "direct", label: "Direct Ask", icon: "paper-plane-outline" },
] as const;

async function loadDashboard() {
  const since = new Date(Date.now() - 30 * 86400_000).toISOString();
  const count = (channel: string) =>
    supabase.from("dm_clicks").select("id", { count: "exact", head: true }).eq("channel", channel).gte("created_at", since);

  const [products, categories, convos, topViewed, recent, ...channelCounts] = await Promise.all([
    supabase.from("products").select("id, category_id, is_visible"),
    supabase.from("categories").select("id, name").order("sort_order"),
    supabase.from("conversations").select("unread_admin, status"),
    supabase.from("products").select("id, name, view_count").order("view_count", { ascending: false }).limit(5),
    supabase.from("dm_clicks").select("id, channel, created_at, product:products(name)").order("created_at", { ascending: false }).limit(10),
    ...CHANNELS.map((ch) => count(ch.key)),
  ]);

  const list = (products.data ?? []) as { id: string; category_id: string | null; is_visible: boolean }[];
  const perCategory = (categories.data ?? []).map((c) => ({ name: c.name as string, count: list.filter((p) => p.category_id === c.id).length }));
  const uncategorized = list.filter((p) => !p.category_id).length;
  if (uncategorized) perCategory.push({ name: "Uncategorized", count: uncategorized });

  return {
    totalProducts: list.length,
    hiddenProducts: list.filter((p) => !p.is_visible).length,
    perCategory,
    unread: (convos.data ?? []).reduce((n, c) => n + (c.unread_admin as number), 0),
    openChats: (convos.data ?? []).filter((c) => c.status === "open").length,
    topViewed: (topViewed.data ?? []) as { id: string; name: string; view_count: number }[],
    channels: CHANNELS.map((ch, i) => ({ ...ch, count: channelCounts[i].count ?? 0 })),
    recent: (recent.data ?? []) as unknown as { id: string; channel: string; created_at: string; product: { name: string } | null }[],
  };
}

function Stat({ label, value, icon, onPress }: { label: string; value: number | string; icon: IconName; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} className="w-1/2 p-1.5 active:opacity-80">
      <Card>
        <Icon name={icon} size={18} color="rose-ink" />
        <Text className="mt-3 font-serif text-4xl">{value}</Text>
        <Text className="text-[12px] text-muted">{label}</Text>
      </Card>
    </Pressable>
  );
}

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const { data, isPending, refetch, isRefetching } = useQuery({ queryKey: [...qk.admin, "dashboard"], queryFn: loadDashboard });
  const maxChannel = Math.max(1, ...(data?.channels.map((x) => x.count) ?? [1]));

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 32 }}
      contentContainerClassName="px-3.5"
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.rose} colors={[c.rose]} />}
    >
      <View className="px-1.5">
        <Eyebrow>Admin</Eyebrow>
        <Heading className="mt-1">Dashboard</Heading>
      </View>

      {isPending || !data ? (
        <View className="mt-4 flex-row flex-wrap">
          {[0, 1, 2, 3].map((i) => (
            <View key={i} className="w-1/2 p-1.5">
              <Skeleton className="h-32" />
            </View>
          ))}
        </View>
      ) : (
        <>
          <View className="mt-4 flex-row flex-wrap">
            <Stat label="Products" value={data.totalProducts} icon="pricetags-outline" onPress={() => router.push("/admin/products")} />
            <Stat label="Unread messages" value={data.unread} icon="mail-unread-outline" onPress={() => router.push("/admin/inbox")} />
            <Stat label="Open chats" value={data.openChats} icon="chatbubbles-outline" onPress={() => router.push("/admin/inbox")} />
            <Stat label="Hidden products" value={data.hiddenProducts} icon="eye-off-outline" />
          </View>

          <Card className="m-1.5 mt-3">
            <Text className="font-medium">Inquiry taps · last 30 days</Text>
            <View className="mt-4 gap-3">
              {data.channels.map((ch) => (
                <View key={ch.key}>
                  <View className="mb-1 flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <Icon name={ch.icon} size={15} color="muted" />
                      <Text className="text-[13px]">{ch.label}</Text>
                    </View>
                    <Text className="font-medium text-[13px]">{ch.count}</Text>
                  </View>
                  <View className="h-2 overflow-hidden rounded-full bg-blush">
                    <View className="h-2 rounded-full bg-rose" style={{ width: `${(ch.count / maxChannel) * 100}%` }} />
                  </View>
                </View>
              ))}
            </View>
          </Card>

          <Card className="m-1.5 mt-3">
            <Text className="font-medium">Most viewed</Text>
            {data.topViewed.map((p, i) => (
              <Pressable key={p.id} onPress={() => router.push(`/admin/product/${p.id}`)} className="flex-row items-center gap-3 border-b border-line py-3 active:opacity-70">
                <Text className="w-5 font-serif text-lg text-rose-ink">{i + 1}</Text>
                <Text className="flex-1" numberOfLines={1}>
                  {p.name}
                </Text>
                <Text className="text-[12px] text-muted">{p.view_count} views</Text>
              </Pressable>
            ))}
          </Card>

          <Card className="m-1.5 mt-3">
            <Text className="font-medium">Products per category</Text>
            <View className="mt-2 flex-row flex-wrap gap-2">
              {data.perCategory.map((cat) => (
                <View key={cat.name} className="rounded-full bg-blush px-3 py-1.5">
                  <Text className="text-[12px]">
                    {cat.name} · {cat.count}
                  </Text>
                </View>
              ))}
            </View>
            <Pressable onPress={() => router.push("/admin/categories")} className="mt-3 active:opacity-70">
              <Text className="text-[13px] text-rose-ink underline">Manage categories</Text>
            </Pressable>
          </Card>

          <Card className="m-1.5 mt-3">
            <Text className="font-medium">Recent inquiries</Text>
            {data.recent.length ? (
              data.recent.map((r) => (
                <View key={r.id} className="flex-row items-center gap-3 border-b border-line py-3">
                  <Icon name={CHANNELS.find((x) => x.key === r.channel)?.icon ?? "chatbubble-outline"} size={16} color="rose-ink" />
                  <Text className="flex-1 text-[13px]" numberOfLines={1}>
                    {r.product?.name ?? "General inquiry"}
                  </Text>
                  <Text className="text-[12px] text-muted">{timeAgo(r.created_at)}</Text>
                </View>
              ))
            ) : (
              <Text className="mt-2 text-[13px] text-muted">No inquiries yet.</Text>
            )}
          </Card>
        </>
      )}
    </ScrollView>
  );
}
