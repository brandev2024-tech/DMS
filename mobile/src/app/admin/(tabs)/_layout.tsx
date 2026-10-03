import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router/js-tabs";
import type { ColorValue } from "react-native";
import { useConversationsRealtime } from "@/components/chat";
import { useUnreadCount } from "@/lib/hooks";
import { useColors } from "@/lib/theme";

type IconName = keyof typeof Ionicons.glyphMap;
const tab = (on: IconName, off: IconName) =>
  function TabIcon({ color, focused, size }: { color: ColorValue; focused: boolean; size: number }) {
    return <Ionicons name={focused ? on : off} size={size - 2} color={color as string} />;
  };

export default function AdminTabs() {
  const c = useColors();
  const unread = useUnreadCount("all");
  // Keep the Inbox badge live while in admin mode.
  useConversationsRealtime("", "all");

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.ink,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.bg, borderTopColor: c.line },
        tabBarLabelStyle: { fontFamily: "Jost_500Medium", fontSize: 11 },
        tabBarBadgeStyle: { backgroundColor: c.rose, color: "#fff", fontSize: 10 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Dashboard", tabBarIcon: tab("stats-chart", "stats-chart-outline") }} />
      <Tabs.Screen name="products" options={{ title: "Products", tabBarIcon: tab("pricetags", "pricetags-outline") }} />
      <Tabs.Screen name="inbox" options={{ title: "Inbox", tabBarIcon: tab("mail", "mail-outline"), tabBarBadge: unread > 0 ? unread : undefined }} />
      <Tabs.Screen name="settings" options={{ title: "Settings", tabBarIcon: tab("settings", "settings-outline") }} />
    </Tabs>
  );
}
