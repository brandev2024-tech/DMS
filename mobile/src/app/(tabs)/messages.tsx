import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, RefreshControl, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { EmptyState } from "@/components/ui/misc";
import { Heading, Text } from "@/components/ui/text";
import { useConversationsRealtime } from "@/components/chat";
import { qk } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ensureConversation } from "@/lib/chat";
import { timeAgo } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { useColors } from "@/lib/theme";
import type { Conversation } from "@/lib/types";

export default function Messages() {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const { userId, ready } = useAuth();
  const [starting, setStarting] = useState(false);
  const { data, refetch, isRefetching } = useQuery({
    queryKey: qk.conversations("mine"),
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("shopper_id", userId!)
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Conversation[];
    },
  });
  useConversationsRealtime(userId ? `shopper_id=eq.${userId}` : null, "mine");

  if (ready && !userId) {
    return (
      <View style={{ paddingTop: insets.top + 8 }} className="flex-1 bg-bg">
        <Heading className="px-5">Messages</Heading>
        <EmptyState icon="chatbubbles-outline" title="Direct Ask" body="Log in to chat with DMS right here in the app — ask about sizes, prices and delivery.">
          <View className="w-full gap-3">
            <Button title="Log in" onPress={() => router.push("/login")} />
            <Button title="Create an account" variant="outline" onPress={() => router.push("/register")} />
          </View>
        </EmptyState>
      </View>
    );
  }

  const start = async () => {
    if (!userId) return;
    setStarting(true);
    try {
      const id = await ensureConversation(userId);
      router.push(`/messages/${id}`);
    } finally {
      setStarting(false);
    }
  };

  return (
    <View className="flex-1 bg-bg">
      <View style={{ paddingTop: insets.top + 8 }} className="px-5 pb-3">
        <Heading>Messages</Heading>
        <Text className="mt-1 text-[13px] text-muted">Your Direct Ask chats with DMS.</Text>
      </View>
      <FlatList
        data={data ?? []}
        keyExtractor={(x) => x.id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.rose} colors={[c.rose]} />}
        contentContainerClassName="px-5 pb-6"
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/messages/${item.id}`)}
            className="flex-row items-center gap-3 border-b border-line py-4 active:opacity-70"
          >
            <View className="h-12 w-12 items-center justify-center rounded-full bg-blush">
              <Text className="font-serif text-lg text-rose-ink">DMS</Text>
            </View>
            <View className="flex-1">
              <View className="flex-row items-center justify-between">
                <Text className="font-medium">DMS</Text>
                <Text className="text-[12px] text-muted">{timeAgo(item.last_message_at)}</Text>
              </View>
              <View className="mt-0.5 flex-row items-center gap-2">
                <Text className={`flex-1 text-[13px] ${item.unread_shopper ? "font-medium text-ink" : "text-muted"}`} numberOfLines={1}>
                  {item.last_message ?? "Say hello 👋"}
                </Text>
                {item.unread_shopper ? (
                  <View className="min-w-5 h-5 items-center justify-center rounded-full bg-rose px-1.5">
                    <Text className="text-[11px] font-medium text-white">{item.unread_shopper}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <EmptyState icon="chatbubble-ellipses-outline" title="No messages yet" body="Tap Direct Ask on any product, or start a chat now." />
        }
        ListFooterComponent={
          <View className="mt-6">
            <Button title="New message to DMS" icon="create-outline" variant="outline" loading={starting} onPress={start} />
            <View className="mt-4 flex-row items-center justify-center gap-1.5">
              <Icon name="lock-closed-outline" size={12} color="muted" />
              <Text className="text-[12px] text-muted">Only you and the DMS team can see these chats.</Text>
            </View>
          </View>
        }
      />
    </View>
  );
}
