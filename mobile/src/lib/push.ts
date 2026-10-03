import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { EAS_PROJECT_ID } from "./env";
import { supabase } from "./supabase";

const TOKEN_KEY = "dms.pushToken";
const PREF_KEY = "dms.pushEnabled";

type NotificationsModule = typeof import("expo-notifications");

/**
 * Expo Go on Android throws as soon as expo-notifications is loaded (remote push was
 * removed from Expo Go in SDK 53), and the web has no notifications. So the module is
 * only loaded where it works: real builds (EAS / development build) and Expo Go on iOS.
 */
export const pushSupported =
  Platform.OS !== "web" && !(Platform.OS === "android" && Constants.executionEnvironment === ExecutionEnvironment.StoreClient);

let loaded: NotificationsModule | null = null;
export function getNotifications(): NotificationsModule | null {
  if (!pushSupported) return null;
  if (!loaded) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    loaded = require("expo-notifications") as NotificationsModule;
    loaded.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }
  return loaded;
}

export async function isPushEnabledPref() {
  return (await AsyncStorage.getItem(PREF_KEY)) !== "off";
}

function projectId() {
  return EAS_PROJECT_ID || Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId || undefined;
}

/**
 * Asks for permission (only ever called after login), gets this device's Expo push
 * token and saves it to `push_tokens`. Returns a short reason when it can't.
 */
export async function registerForPush(): Promise<{ ok: boolean; reason?: string }> {
  if (Platform.OS === "web") return { ok: false, reason: "Notifications are only available in the phone app." };
  const Notifications = getNotifications();
  if (!Notifications) return { ok: false, reason: "Push notifications don't work in Expo Go on Android. Use a test build (see README)." };
  if (!Device.isDevice) return { ok: false, reason: "Push notifications need a real phone." };

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("messages", {
      name: "Messages",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 120, 200],
      lightColor: "#D8A7B1",
    });
  }

  let { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== "granted") return { ok: false, reason: "Notifications are turned off for DMS in your phone settings." };

  const pid = projectId();
  if (!pid) return { ok: false, reason: "Push isn't set up for this build yet (missing EAS project id)." };

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: pid });
    const { error } = await supabase.rpc("register_push_token", { p_token: token, p_platform: Platform.OS });
    if (error) return { ok: false, reason: error.message };
    await AsyncStorage.multiSet([
      [TOKEN_KEY, token],
      [PREF_KEY, "on"],
    ]);
    return { ok: true };
  } catch (e) {
    // e.g. Expo Go on Android, which no longer supports remote push.
    return { ok: false, reason: e instanceof Error ? e.message : "Couldn't turn on notifications." };
  }
}

/** Removes this device's token so the current account stops getting pushes here. */
export async function unregisterPush(rememberOff = false) {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) await supabase.from("push_tokens").delete().eq("token", token);
  await AsyncStorage.removeItem(TOKEN_KEY);
  if (rememberOff) await AsyncStorage.setItem(PREF_KEY, "off");
}

/** Sign out everywhere in the app: stop pushes for this account on this phone first. */
export async function signOut() {
  await unregisterPush().catch(() => {});
  await supabase.auth.signOut();
}
