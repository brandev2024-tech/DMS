import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { qk } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { markRead, sendMessage } from "@/lib/chat";
import { API_URL } from "@/lib/env";
import { clockTime, dayLabel } from "@/lib/format";
import { useSettings } from "@/lib/hooks";
import { imageUrl } from "@/lib/images";
import { supabase } from "@/lib/supabase";
import { useColors } from "@/lib/theme";
import type { Message, ProductSnapshot } from "@/lib/types";
import { pickImages, uploadImage } from "@/lib/upload";
import { Icon } from "./ui/icon";
import { Text } from "./ui/text";
import { useToast } from "./ui/toast";

/** Keeps a conversation list fresh: any change to matching conversations refetches it. */
export function useConversationsRealtime(filter: string | null, scope: "mine" | "all") {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (filter === null) return;
    const channel = supabase
      .channel(`conversations-${scope}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations", ...(filter ? { filter } : {}) }, () => {
        queryClient.invalidateQueries({ queryKey: qk.conversations(scope) });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [filter, scope, queryClient]);
}

/** Also sends the website's web-push (for admins on the website), best effort. */
async function notifyWebPush(conversationId: string) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token || !API_URL) return;
  fetch(`${API_URL}/api/push/notify`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ conversationId }),
  }).catch(() => {});
}

type Row = { type: "day"; id: string; label: string } | { type: "msg"; id: string; m: Message };

export function ChatThread({ conversationId, isAdminView }: { conversationId: string; isAdminView: boolean }) {
  const { userId } = useAuth();
  const settings = useSettings();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const toast = useToast();
  const queryClient = useQueryClient();
  const key = qk.messages(conversationId);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [upload, setUpload] = useState<number | null>(null);
  const [viewer, setViewer] = useState<string | null>(null);
  const listRef = useRef<FlatList<Row>>(null);

  const { data: messages = [], isPending } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as Message[];
    },
  });

  // Realtime: new messages and read receipts.
  useEffect(() => {
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        const m = payload.new as Message;
        if (!m?.id) return;
        queryClient.setQueryData<Message[]>(key, (prev = []) => {
          const i = prev.findIndex((x) => x.id === m.id);
          if (i === -1) return [...prev, m];
          const next = prev.slice();
          next[i] = m;
          return next;
        });
        if (payload.eventType === "INSERT" && m.sender_id !== userId) markRead(conversationId);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, userId]);

  // Opening the chat marks the other side's messages as read.
  useEffect(() => {
    markRead(conversationId).then(() => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    });
  }, [conversationId, queryClient]);

  // Newest at the bottom, with a day divider whenever the date changes (list is inverted).
  const rows = useMemo(() => {
    const out: Row[] = [];
    let lastDay = "";
    for (const m of messages) {
      const day = new Date(m.created_at).toDateString();
      if (day !== lastDay) {
        out.push({ type: "day", id: `day-${day}`, label: dayLabel(m.created_at) });
        lastDay = day;
      }
      out.push({ type: "msg", id: m.id, m });
    }
    return out.reverse();
  }, [messages]);

  const lastMineId = useMemo(() => [...messages].reverse().find((m) => m.sender_id === userId)?.id, [messages, userId]);

  const add = (m: Message) =>
    queryClient.setQueryData<Message[]>(key, (prev = []) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));

  const send = async (body: string) => {
    if (!userId || !body.trim()) return;
    setSending(true);
    try {
      add(await sendMessage(conversationId, userId, { body: body.trim() }));
      setText("");
      notifyWebPush(conversationId);
    } catch {
      toast("Couldn't send. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const sendPhoto = async (source: "camera" | "library") => {
    if (!userId) return;
    try {
      const [img] = await pickImages(source);
      if (!img) return;
      setUpload(0);
      const key = await uploadImage("chat", img, setUpload);
      add(await sendMessage(conversationId, userId, { image_key: key }));
      notifyWebPush(conversationId);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't send the photo.");
    } finally {
      setUpload(null);
    }
  };

  const choosePhoto = () =>
    Alert.alert("Send a photo", undefined, [
      { text: "Take photo", onPress: () => sendPhoto("camera") },
      { text: "Choose from library", onPress: () => sendPhoto("library") },
      { text: "Cancel", style: "cancel" },
    ]);

  return (
    <KeyboardAvoidingView className="flex-1 bg-bg" behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}>
      {isPending ? (
        <ActivityIndicator className="flex-1" color={c.rose} />
      ) : (
        <FlatList
          ref={listRef}
          inverted
          data={rows}
          keyExtractor={(r) => r.id}
          contentContainerClassName="px-4 py-3"
          keyboardDismissMode="interactive"
          ListFooterComponent={
            !messages.length ? (
              <Text className="py-10 text-center text-[13px] text-muted">
                {isAdminView ? "No messages yet." : "Ask us anything about sizes, prices or delivery 💕"}
              </Text>
            ) : null
          }
          renderItem={({ item }) => {
            if (item.type === "day") {
              return <Text className="my-3 text-center text-[11px] uppercase tracking-[1.5px] text-muted">{item.label}</Text>;
            }
            const m = item.m;
            const mine = m.sender_id === userId;
            return (
              <View className={`my-1 max-w-[80%] ${mine ? "self-end items-end" : "self-start items-start"}`}>
                {m.product_snapshot ? <ProductBubble snap={m.product_snapshot} mine={mine} /> : null}
                {m.image_key ? (
                  <Pressable onPress={() => setViewer(imageUrl(m.image_key))} className="mt-1 overflow-hidden rounded-2xl">
                    <Image source={imageUrl(m.image_key)} alt="Photo in chat" style={{ width: 200, height: 240 }} contentFit="cover" transition={150} />
                  </Pressable>
                ) : null}
                {m.body ? (
                  <View className={`mt-1 rounded-3xl px-4 py-2.5 ${mine ? "rounded-br-md bg-ink" : "rounded-bl-md bg-blush"}`}>
                    <Text className={mine ? "text-on-ink" : "text-ink"} selectable>
                      {m.body}
                    </Text>
                  </View>
                ) : null}
                <Text className="mt-1 px-1 text-[10px] text-muted">
                  {clockTime(m.created_at)}
                  {mine && m.id === lastMineId ? (m.read_at ? " · Seen" : " · Sent") : ""}
                </Text>
              </View>
            );
          }}
        />
      )}

      {isAdminView && settings.quick_replies.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="max-h-12 border-t border-line" contentContainerClassName="items-center gap-2 px-3 py-2">
          {settings.quick_replies.map((q) => (
            <Pressable key={q} onPress={() => setText((t) => (t ? `${t} ${q}` : q))} className="rounded-full border border-line bg-surface px-3 py-1.5 active:opacity-70">
              <Text className="text-[12px]" numberOfLines={1}>
                {q}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {upload !== null ? (
        <View className="h-1 bg-line">
          <View className="h-1 bg-rose" style={{ width: `${Math.round(upload * 100)}%` }} />
        </View>
      ) : null}

      <View className="flex-row items-end gap-2 border-t border-line bg-bg px-3 pt-2" style={{ paddingBottom: Math.max(insets.bottom, 8) }}>
        <Pressable accessibilityLabel="Send a photo" onPress={choosePhoto} disabled={upload !== null} className="h-11 w-11 items-center justify-center rounded-full bg-blush active:opacity-70">
          <Icon name="camera-outline" size={20} color="rose-ink" />
        </Pressable>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Write a message…"
          placeholderTextColor={c.muted}
          multiline
          className="max-h-32 min-h-11 flex-1 rounded-3xl border border-line bg-surface px-4 py-2.5 font-sans text-[15px] text-ink"
        />
        <Pressable
          accessibilityLabel="Send"
          onPress={() => send(text)}
          disabled={sending || !text.trim()}
          className={`h-11 w-11 items-center justify-center rounded-full ${text.trim() ? "bg-ink" : "bg-line"}`}
        >
          {sending ? <ActivityIndicator color={c["on-ink"]} /> : <Icon name="arrow-up" size={20} color={text.trim() ? "on-ink" : "muted"} />}
        </Pressable>
      </View>

      <Modal visible={Boolean(viewer)} transparent animationType="fade" onRequestClose={() => setViewer(null)}>
        <Pressable onPress={() => setViewer(null)} className="flex-1 items-center justify-center bg-black">
          {viewer ? <Image source={viewer} alt="Photo" style={{ width: "100%", height: "80%" }} contentFit="contain" /> : null}
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function ProductBubble({ snap, mine }: { snap: ProductSnapshot; mine: boolean }) {
  return (
    <Pressable
      onPress={() => router.push(`/product/${snap.slug}`)}
      className={`w-64 flex-row gap-3 rounded-2xl border p-2.5 active:opacity-80 ${mine ? "border-ink/20 bg-blush" : "border-line bg-surface"}`}
    >
      <View className="h-16 w-16 overflow-hidden rounded-xl bg-blush">
        {snap.image ? <Image source={snap.image} alt={snap.name} style={{ width: "100%", height: "100%" }} contentFit="cover" /> : null}
      </View>
      <View className="flex-1">
        <Text className="text-[9px] uppercase tracking-[1.5px] text-gold-ink">Product inquiry</Text>
        <Text className="font-serif text-[16px] leading-tight" numberOfLines={2}>
          {snap.name}
        </Text>
        <Text className="mt-0.5 text-[12px] font-medium">{snap.price ?? "DM for Price"}</Text>
        {snap.size || snap.color ? (
          <Text className="text-[11px] text-muted">{[snap.size && `Size ${snap.size}`, snap.color].filter(Boolean).join(" · ")}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}
