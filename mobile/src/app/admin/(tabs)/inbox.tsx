import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useConversationsRealtime } from "@/components/chat";
import { Chip, EmptyState } from "@/components/ui/misc";
import { Heading, Text } from "@/components/ui/text";
import { qk } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { useColors } from "@/lib/theme";
import type { Conversation, ConversationStatus } from "@/lib/types";

const FILTERS: { key: ConversationStatus | "unread"; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "unread", label: "Unread" },
  { key: "resolved", label: "Resolved" },
  { key: "archived", label: "Archived" },
];

export default function Inbox() {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("open");
  const { data = [], refetch, isRefetching, isPending } = useQuery({
    queryKey: qk.conversations("all"),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("*, shopper:profiles(full_name, phone, address)")
        .order("last_message_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Conversation[];
    },
  });
  useConversationsRealtime("", "all");

  // Unread first, then newest.
  const list = useMemo(
    () =>
      data
        .filter((x) => (filter === "unread" ? x.unread_admin > 0 : x.status === filter))
        .sort((a, b) => Number(b.unread_admin > 0) - Number(a.unread_admin > 0) || b.last_message_at.localeCompare(a.last_message_at)),
    [data, filter],
  );

  return (
    <View className="flex-1 bg-bg">
      <View style={{ paddingTop: insets.top + 8 }} className="px-5 pb-2">
        <Heading>Inbox</Heading>
        <Text className="mt-1 text-[13px] text-muted">Direct Ask chats from the app and the website.</Text>
        <View className="mt-3 flex-row flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Chip key={f.key} label={f.label} active={filter === f.key} onPress={() => setFilter(f.key)} />
          ))}
        </View>
      </View>
      <FlatList
        data={list}
        keyExtractor={(x) => x.id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.rose} colors={[c.rose]} />}
        contentContainerClassName="px-5 pb-8"
        ListEmptyComponent={isPending ? null : <EmptyState icon="mail-open-outline" title="All caught up" body="New Direct Ask chats will show up here." />}
        renderItem={({ item }) => {
          const name = item.shopper?.full_name || "Shopper";
          return (
            <Pressable onPress={() => router.push(`/messages/${item.id}`)} className="flex-row items-center gap-3 border-b border-line py-4 active:opacity-70">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-blush">
                <Text className="font-serif text-xl text-rose-ink">{name.charAt(0).toUpperCase()}</Text>
              </View>
              <View className="flex-1">
                <View className="flex-row items-center justify-between">
                  <Text className={item.unread_admin ? "font-semibold" : "font-medium"} numberOfLines={1}>
                    {name}
                  </Text>
                  <Text className="text-[12px] text-muted">{timeAgo(item.last_message_at)}</Text>
                </View>
                <View className="mt-0.5 flex-row items-center gap-2">
                  <Text className={`flex-1 text-[13px] ${item.unread_admin ? "text-ink" : "text-muted"}`} numberOfLines={1}>
                    {item.last_message ?? "New conversation"}
                  </Text>
                  {item.unread_admin ? (
                    <View className="h-5 min-w-5 items-center justify-center rounded-full bg-rose px-1.5">
                      <Text className="text-[11px] font-medium text-white">{item.unread_admin}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}
