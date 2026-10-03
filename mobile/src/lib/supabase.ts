import "react-native-url-polyfill/auto";

import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { AppState, Platform } from "react-native";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

/**
 * Keeps the Supabase session in the device keychain / keystore (expo-secure-store).
 * Sessions are larger than the ~2 KB some iOS versions accept per value, so they
 * are split into chunks: "<key>.n" holds the chunk count, "<key>.0…" the parts.
 */
const CHUNK = 1800;
const safe = (key: string) => key.replace(/[^\w.-]/g, "_");

const secureStorage = {
  async getItem(key: string) {
    const k = safe(key);
    const n = Number(await SecureStore.getItemAsync(`${k}.n`));
    if (!n) return null;
    const parts = await Promise.all(Array.from({ length: n }, (_, i) => SecureStore.getItemAsync(`${k}.${i}`)));
    return parts.some((p) => p == null) ? null : parts.join("");
  },
  async setItem(key: string, value: string) {
    const k = safe(key);
    await this.removeItem(key);
    const parts = value.match(new RegExp(`[\\s\\S]{1,${CHUNK}}`, "g")) ?? [""];
    await Promise.all(parts.map((p, i) => SecureStore.setItemAsync(`${k}.${i}`, p)));
    await SecureStore.setItemAsync(`${k}.n`, String(parts.length));
  },
  async removeItem(key: string) {
    const k = safe(key);
    const n = Number(await SecureStore.getItemAsync(`${k}.n`));
    await Promise.all(Array.from({ length: n || 0 }, (_, i) => SecureStore.deleteItemAsync(`${k}.${i}`)));
    await SecureStore.deleteItemAsync(`${k}.n`);
  },
};

// Web (expo start --web) has no keychain; fall back to localStorage there.
const storage = Platform.OS === "web" ? undefined : secureStorage;

export const supabase = createClient(SUPABASE_URL || "https://placeholder.supabase.co", SUPABASE_ANON_KEY || "placeholder", {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: "pkce",
  },
});

// Only refresh tokens while the app is in the foreground.
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
