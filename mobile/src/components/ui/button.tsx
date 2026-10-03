import * as Haptics from "expo-haptics";
import { ActivityIndicator, Pressable, type PressableProps, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useColors } from "@/lib/theme";
import { Icon, type IconName } from "./icon";
import { Text } from "./text";

type Variant = "primary" | "outline" | "ghost" | "rose" | "danger" | "light";

const styles: Record<Variant, { box: string; text: string; icon: string }> = {
  primary: { box: "bg-ink", text: "text-on-ink", icon: "on-ink" },
  rose: { box: "bg-rose", text: "text-white", icon: "#ffffff" },
  outline: { box: "border border-ink/80 bg-transparent", text: "text-ink", icon: "ink" },
  ghost: { box: "bg-transparent", text: "text-ink", icon: "ink" },
  danger: { box: "border border-red-500/60 bg-transparent", text: "text-red-500", icon: "#ef4444" },
  light: { box: "bg-white", text: "text-[#1D1A1A]", icon: "#1D1A1A" },
};

type Props = Omit<PressableProps, "children"> & {
  title: string;
  variant?: Variant;
  icon?: IconName;
  loading?: boolean;
  small?: boolean;
  className?: string;
  haptic?: boolean;
};

/** Pill button with a soft press animation and haptic tick, like the website's buttons. */
export function Button({ title, variant = "primary", icon, loading, small, className = "", haptic = true, onPress, disabled, ...rest }: Props) {
  const colors = useColors();
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const s = styles[variant];
  const iconColor = (colors as Record<string, string>)[s.icon] ?? s.icon;

  return (
    <Animated.View style={animated} className={className}>
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPressIn={() => scale.set(withSpring(0.97, { damping: 20, stiffness: 400 }))}
      onPressOut={() => scale.set(withSpring(1, { damping: 20, stiffness: 400 }))}
      onPress={(e) => {
        if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress?.(e);
      }}
      className={`flex-row items-center justify-center gap-2 rounded-full ${small ? "h-10 px-4" : "h-12 px-6"} ${s.box} ${disabled ? "opacity-50" : ""}`}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={iconColor} />
      ) : (
        <View className="flex-row items-center gap-2">
          {icon ? <Icon name={icon} size={small ? 16 : 18} color={iconColor} /> : null}
          <Text className={`font-medium ${small ? "text-[13px]" : "text-[14px]"} tracking-wide ${s.text}`}>{title}</Text>
        </View>
      )}
    </Pressable>
    </Animated.View>
  );
}

/** Round icon-only button (back, share, heart). */
export function IconButton({ name, onPress, label, size = 20, color = "ink", className = "" }: { name: IconName; onPress?: () => void; label: string; size?: number; color?: string; className?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress?.();
      }}
      className={`h-10 w-10 items-center justify-center rounded-full bg-surface/90 active:opacity-70 ${className}`}
    >
      <Icon name={name} size={size} color={color} />
    </Pressable>
  );
}
