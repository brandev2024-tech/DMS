import type { ExpoConfig } from "expo/config";

// Public website domain: product links shared from the site open in the app
// (iOS universal links / Android App Links). Change it when you move to a custom domain.
const WEB_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://dms.agriscope2026.workers.dev";
const WEB_HOST = new URL(WEB_URL).host;
const EAS_PROJECT_ID = process.env.EXPO_PUBLIC_EAS_PROJECT_ID || undefined;

const config: ExpoConfig = {
  name: "DMS – Direct Message Us",
  slug: "dms-direct-message-us",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "dms",
  userInterfaceStyle: "automatic",
  backgroundColor: "#FCFAF8",
  ios: {
    bundleIdentifier: "com.dms.shop",
    supportsTablet: false,
    usesAppleSignIn: true,
    associatedDomains: [`applinks:${WEB_HOST}`],
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: "com.dms.shop",
    adaptiveIcon: {
      backgroundColor: "#F8E1E7",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
    // Only what the app needs: no microphone, no location, no contacts.
    blockedPermissions: ["android.permission.RECORD_AUDIO"],
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [{ scheme: "https", host: WEB_HOST, pathPrefix: "/product" }],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  web: {
    output: "single",
    bundler: "metro",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-apple-authentication",
    "expo-sharing",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#F8E1E7",
        image: "./assets/images/splash-icon.png",
        imageWidth: 220,
        dark: { backgroundColor: "#131011", image: "./assets/images/splash-icon-dark.png" },
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission: "DMS uses your photo library so you can send photos in Direct Ask chats and, for shop admins, add product photos.",
        cameraPermission: "DMS uses the camera so you can take photos to send in Direct Ask chats and, for shop admins, photograph products.",
        microphonePermission: false,
      },
    ],
    [
      "expo-notifications",
      {
        icon: "./assets/images/notification-icon.png",
        color: "#D8A7B1",
      },
    ],
  ],
  extra: {
    ...(EAS_PROJECT_ID ? { eas: { projectId: EAS_PROJECT_ID } } : {}),
  },
  experiments: {
    typedRoutes: false,
    reactCompiler: true,
  },
};

export default config;
