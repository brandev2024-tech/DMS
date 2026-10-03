import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import { useColors, type Colors } from "@/lib/theme";

export type IconName = ComponentProps<typeof Ionicons>["name"];

export function Icon({ name, size = 20, color = "ink" }: { name: IconName; size?: number; color?: keyof Colors | (string & {}) }) {
  const colors = useColors();
  return <Ionicons name={name} size={size} color={(colors as Record<string, string>)[color] ?? color} />;
}
