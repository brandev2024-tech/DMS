import { Redirect, Stack } from "expo-router";
import { ActivityIndicator } from "react-native";
import { useAuth } from "@/lib/auth";
import { palette, useScheme } from "@/lib/theme";

/**
 * Admin mode. This only hides screens from shoppers — every admin write is also
 * blocked by the database's Row Level Security for anyone who isn't an admin.
 */
export default function AdminLayout() {
  const { ready, userId, profile, isAdmin } = useAuth();
  const c = palette[useScheme()];

  if (!ready || (userId && !profile)) return <ActivityIndicator className="flex-1 bg-bg" color={c.rose} />;
  if (!isAdmin) return <Redirect href="/" />;

  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerBackButtonDisplayMode: "minimal",
        headerTintColor: c.ink,
        headerTitleStyle: { fontFamily: "CormorantGaramond_500Medium", fontSize: 22, color: c.ink },
        contentStyle: { backgroundColor: c.bg },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="product/[id]" options={{ title: "Product" }} />
      <Stack.Screen name="categories" options={{ title: "Categories" }} />
    </Stack>
  );
}
