import { vars } from "nativewind";
import type { ReactNode } from "react";
import { useColorScheme, View } from "react-native";

/** The website's palette (globals.css), as hex for icons/navigation and RGB triplets for NativeWind. */
export const palette = {
  light: {
    bg: "#FCFAF8",
    surface: "#FFFFFF",
    blush: "#F7EEEF",
    rose: "#D8A7B1",
    "rose-ink": "#A3596B",
    gold: "#C9A96E",
    "gold-ink": "#8A6A2E",
    ink: "#1D1A1A",
    muted: "#6F6868",
    line: "#EBE5E2",
    "on-ink": "#FCFAF8",
  },
  dark: {
    bg: "#131011",
    surface: "#1B1718",
    blush: "#251E20",
    rose: "#C494A0",
    "rose-ink": "#E8B1BF",
    gold: "#D6B97F",
    "gold-ink": "#E2C68F",
    ink: "#F4EFED",
    muted: "#A69C9C",
    line: "#2D2628",
    "on-ink": "#131011",
  },
} as const;

export type Colors = { [K in keyof (typeof palette)["light"]]: string };

const toTriplet = (hex: string) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(" ");

const themeVars = Object.fromEntries(
  (["light", "dark"] as const).map((scheme) => [
    scheme,
    vars(Object.fromEntries(Object.entries(palette[scheme]).map(([k, v]) => [`--${k}`, toTriplet(v)]))),
  ]),
) as Record<"light" | "dark", ReturnType<typeof vars>>;

export function useScheme(): "light" | "dark" {
  return useColorScheme() === "dark" ? "dark" : "light";
}

export function useColors(): Colors {
  return palette[useScheme()];
}

/** Provides the CSS variables behind bg-*, text-* … classes; follows the phone's dark mode. */
export function ThemeRoot({ children, transparent }: { children: ReactNode; transparent?: boolean }) {
  const scheme = useScheme();
  return (
    <View style={[{ flex: 1, backgroundColor: transparent ? "transparent" : palette[scheme].bg }, themeVars[scheme]]}>
      {children}
    </View>
  );
}
