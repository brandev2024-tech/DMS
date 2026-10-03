import NetInfo from "@react-native-community/netinfo";
import * as Haptics from "expo-haptics";
import { useEffect, useState, type ReactNode } from "react";
import { Pressable, Switch, View } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { useColors } from "@/lib/theme";
import { Icon, type IconName } from "./icon";
import { Heading, Text } from "./text";

export function EmptyState({ icon, title, body, children }: { icon: IconName; title: string; body?: string; children?: ReactNode }) {
  return (
    <View className="items-center px-8 py-16">
      <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-blush">
        <Icon name={icon} size={26} color="rose-ink" />
      </View>
      <Heading className="text-center text-2xl">{title}</Heading>
      {body ? <Text className="mt-2 text-center text-muted">{body}</Text> : null}
      {children ? <View className="mt-6 w-full items-center">{children}</View> : null}
    </View>
  );
}

export function Chip({ label, active, onPress, disabled }: { label: string; active?: boolean; onPress?: () => void; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress?.();
      }}
      className={`h-9 items-center justify-center rounded-full border px-4 ${active ? "border-ink bg-ink" : "border-line bg-surface"} ${disabled ? "opacity-40" : ""}`}
    >
      <Text className={`text-[13px] ${active ? "font-medium text-on-ink" : "text-ink"}`}>{label}</Text>
    </Pressable>
  );
}

/** A tappable settings-style row. */
export function Row({ icon, label, detail, onPress, danger, right }: { icon?: IconName; label: string; detail?: string | null; onPress?: () => void; danger?: boolean; right?: ReactNode }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={!onPress}
      className="flex-row items-center gap-3 border-b border-line px-1 py-4 active:opacity-60"
    >
      {icon ? <Icon name={icon} size={20} color={danger ? "#ef4444" : "rose-ink"} /> : null}
      <View className="flex-1">
        <Text className={danger ? "text-red-500" : ""}>{label}</Text>
        {detail ? <Text className="mt-0.5 text-[12px] text-muted" numberOfLines={1}>{detail}</Text> : null}
      </View>
      {right ?? (onPress ? <Icon name="chevron-forward" size={16} color="muted" /> : null)}
    </Pressable>
  );
}

export function Toggle({ label, detail, value, onChange }: { label: string; detail?: string; value: boolean; onChange: (v: boolean) => void }) {
  const colors = useColors();
  return (
    <View className="flex-row items-center gap-3 py-3">
      <View className="flex-1">
        <Text>{label}</Text>
        {detail ? <Text className="mt-0.5 text-[12px] text-muted">{detail}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={(v) => {
          Haptics.selectionAsync().catch(() => {});
          onChange(v);
        }}
        trackColor={{ true: colors.rose, false: colors.line }}
        thumbColor="#ffffff"
      />
    </View>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <View className={`rounded-3xl border border-line bg-surface p-4 ${className}`}>{children}</View>;
}

/** Small "You're offline" banner that appears while there is no connection. */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  useEffect(() => NetInfo.addEventListener((s) => setOffline(s.isConnected === false || s.isInternetReachable === false)), []);
  if (!offline) return null;
  return (
    <Animated.View entering={FadeInUp} exiting={FadeOutUp} className="flex-row items-center justify-center gap-2 bg-ink px-4 py-1.5">
      <Icon name="cloud-offline-outline" size={14} color="on-ink" />
      <Text className="text-[12px] text-on-ink">You&apos;re offline — showing saved items</Text>
    </Animated.View>
  );
}
