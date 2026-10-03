import "@/global.css";

import { CormorantGaramond_500Medium } from "@expo-google-fonts/cormorant-garamond/500Medium";
import { CormorantGaramond_500Medium_Italic } from "@expo-google-fonts/cormorant-garamond/500Medium_Italic";
import { Jost_400Regular } from "@expo-google-fonts/jost/400Regular";
import { Jost_500Medium } from "@expo-google-fonts/jost/500Medium";
import { Jost_600SemiBold } from "@expo-google-fonts/jost/600SemiBold";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { focusManager, onlineManager, QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useFonts } from "expo-font";
import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { OfflineBanner } from "@/components/ui/misc";
import { ToastProvider } from "@/components/ui/toast";
import { AuthProvider, useAuth } from "@/lib/auth";
import { FavoritesProvider } from "@/lib/favorites";
import { getNotifications, isPushEnabledPref, registerForPush } from "@/lib/push";
import { palette, ThemeRoot, useScheme } from "@/lib/theme";

SplashScreen.preventAutoHideAsync();

// Refetch when the connection comes back / the app returns to the foreground.
onlineManager.setEventListener((setOnline) => NetInfo.addEventListener((s) => setOnline(s.isConnected !== false)));
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (s) => focusManager.setFocused(s === "active"));
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, gcTime: 24 * 60 * 60_000, retry: 2, networkMode: "offlineFirst" },
  },
});

// Catalog, settings and favorites are saved on the phone so the app opens instantly
// and still shows the last loaded products when offline.
const PERSISTED = new Set(["settings", "categories", "products", "product", "favorites", "drop-points", "profile"]);
const persister = createAsyncStoragePersister({ storage: AsyncStorage, key: "dms.cache.v1", throttleTime: 2000 });

/** Opens the right chat when a push notification is tapped (also when it launched the app). */
function NotificationRouter() {
  const lastHandled = useRef<string | null>(null);
  useEffect(() => {
    const Notifications = getNotifications();
    if (!Notifications) return;
    const open = (response: import("expo-notifications").NotificationResponse | null) => {
      if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
      const id = response.notification.request.identifier;
      if (lastHandled.current === id) return;
      lastHandled.current = id;
      const url = response.notification.request.content.data?.url;
      if (typeof url === "string" && url.startsWith("/")) router.push(url as never);
    };
    open(Notifications.getLastNotificationResponse());
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, []);
  return null;
}

/** Asks for notification permission after login (never on first launch). */
function PushOnLogin() {
  const { userId } = useAuth();
  const done = useRef<string | null>(null);
  useEffect(() => {
    if (!userId || done.current === userId) return;
    done.current = userId;
    isPushEnabledPref().then((on) => {
      if (on) registerForPush();
    });
  }, [userId]);
  return null;
}

function Navigation() {
  const scheme = useScheme();
  const c = palette[scheme];
  const base = scheme === "dark" ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: { ...base.colors, primary: c["rose-ink"], background: c.bg, card: c.bg, text: c.ink, border: c.line, notification: c.rose },
  };
  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <OfflineBanner />
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
        <Stack.Screen name="admin" options={{ headerShown: false }} />
        <Stack.Screen name="product/[slug]" options={{ headerShown: false }} />
        <Stack.Screen name="messages/[id]" options={{ title: "Direct Ask" }} />
        <Stack.Screen name="login" options={{ title: "Welcome back", presentation: "modal" }} />
        <Stack.Screen name="register" options={{ title: "Create account", presentation: "modal" }} />
        <Stack.Screen name="forgot-password" options={{ title: "Reset password", presentation: "modal" }} />
        <Stack.Screen name="reset-password" options={{ title: "New password" }} />
        <Stack.Screen name="profile" options={{ title: "Edit profile" }} />
        <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
        <Stack.Screen name="drop-offs" options={{ title: "Drop-offs & shipping" }} />
      </Stack>
      <NotificationRouter />
      <PushOnLogin />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  // Only the weights the app uses (importing the package index would bundle all of them).
  const [loaded, fontError] = useFonts({ CormorantGaramond_500Medium, CormorantGaramond_500Medium_Italic, Jost_400Regular, Jost_500Medium, Jost_600SemiBold });
  // If fonts fail to load, carry on with the system fonts rather than staying on the splash.
  const ready = loaded || Boolean(fontError);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);
  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: 7 * 24 * 60 * 60_000,
          dehydrateOptions: { shouldDehydrateQuery: (q) => q.state.status === "success" && PERSISTED.has(String(q.queryKey[0])) },
        }}
      >
        <ThemeRoot>
          <AuthProvider>
            <FavoritesProvider>
              <ToastProvider>
                <Navigation />
              </ToastProvider>
            </FavoritesProvider>
          </AuthProvider>
        </ThemeRoot>
      </PersistQueryClientProvider>
    </GestureHandlerRootView>
  );
}
