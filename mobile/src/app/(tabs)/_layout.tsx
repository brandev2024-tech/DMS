import Ionicons from "@expo/vector-icons/Ionicons";
import { Redirect } from "expo-router";
import type { ColorValue } from "react-native";
import { Tabs } from "expo-router/js-tabs";
import { useAuth } from "@/lib/auth";
import { useUnreadCount } from "@/lib/hooks";
import { useColors } from "@/lib/theme";

type IconName = keyof typeof Ionicons.glyphMap;
const tab = (on: IconName, off: IconName) =>
  function TabIcon({ color, focused, size }: { color: ColorValue; focused: boolean; size: number }) {
    // Tab tint colours are always plain strings here.
    return <Ionicons name={focused ? on : off} size={size - 2} color={color as string} />;
  };

export default function ShopTabs() {
  const c = useColors();
  const { mode, userId } = useAuth();
  const unread = useUnreadCount("mine");

  // Admins open in admin mode (they can switch back to the shop from Admin → Settings).
  if (mode === "admin") return <Redirect href="/admin" />;

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
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: tab("home", "home-outline") }} />
      <Tabs.Screen name="shop" options={{ title: "Shop", tabBarIcon: tab("grid", "grid-outline") }} />
      <Tabs.Screen name="favorites" options={{ title: "Favorites", tabBarIcon: tab("heart", "heart-outline") }} />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: tab("chatbubbles", "chatbubbles-outline"),
          tabBarBadge: userId && unread > 0 ? unread : undefined,
        }}
      />
      <Tabs.Screen name="account" options={{ title: "Account", tabBarIcon: tab("person", "person-outline") }} />
    </Tabs>
  );
}
