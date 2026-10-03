import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect, router, Stack, useLocalSearchParams } from "expo-router";
import { ActionSheetIOS, Alert, Platform, Pressable } from "react-native";
import { ChatThread } from "@/components/chat";
import { Icon } from "@/components/ui/icon";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { Conversation, ConversationStatus } from "@/lib/types";

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId, ready, isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const { data: convo } = useQuery({
    queryKey: ["conversation", id],
    enabled: Boolean(userId && id),
    queryFn: async () => {
      const { data } = await supabase
        .from("conversations")
        .select("*, shopper:profiles(full_name, phone, address)")
        .eq("id", id)
        .maybeSingle();
      return data as Conversation | null;
    },
  });

  if (ready && !userId) return <Redirect href="/login" />;

  const isAdminView = isAdmin && Boolean(convo) && convo?.shopper_id !== userId;
  const title = isAdminView ? convo?.shopper?.full_name || "Shopper" : "DMS";

  const setStatus = async (status: ConversationStatus) => {
    const { error } = await supabase.from("conversations").update({ status }).eq("id", id);
    if (error) return Alert.alert("Couldn't update", error.message);
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
    queryClient.invalidateQueries({ queryKey: ["conversation", id] });
    if (status === "archived") router.back();
  };

  const showActions = () => {
    const details = [convo?.shopper?.phone && `Phone: ${convo.shopper.phone}`, convo?.shopper?.address && `Address: ${convo.shopper.address}`]
      .filter(Boolean)
      .join("\n");
    const options = [
      convo?.status === "resolved" ? "Mark as open" : "Mark resolved",
      convo?.status === "archived" ? "Unarchive" : "Archive",
      "Shopper details",
      "Cancel",
    ];
    const handle = (i: number) => {
      if (i === 0) setStatus(convo?.status === "resolved" ? "open" : "resolved");
      if (i === 1) setStatus(convo?.status === "archived" ? "open" : "archived");
      if (i === 2) Alert.alert(convo?.shopper?.full_name || "Shopper", details || "No phone or address saved yet.");
    };
    if (Platform.OS === "ios") ActionSheetIOS.showActionSheetWithOptions({ options, cancelButtonIndex: 3 }, handle);
    else
      Alert.alert("Conversation", undefined, [
        { text: options[0], onPress: () => handle(0) },
        { text: options[1], onPress: () => handle(1) },
        { text: options[2], onPress: () => handle(2) },
        { text: "Cancel", style: "cancel" },
      ]);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title,
          headerRight: isAdminView
            ? () => (
                <Pressable accessibilityLabel="Conversation options" onPress={showActions} hitSlop={10}>
                  <Icon name="ellipsis-horizontal-circle-outline" size={24} />
                </Pressable>
              )
            : undefined,
        }}
      />
      {id ? <ChatThread conversationId={id} isAdminView={isAdminView} /> : null}
    </>
  );
}
