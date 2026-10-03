import { useEffect } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

export function Skeleton({ className = "" }: { className?: string }) {
  const opacity = useSharedValue(0.5);
  useEffect(() => {
    opacity.set(withRepeat(withTiming(1, { duration: 800 }), -1, true));
  }, [opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return <Animated.View style={style} className={`rounded-2xl bg-blush ${className}`} />;
}

export function ProductCardSkeleton() {
  return (
    <View className="flex-1 gap-2 p-1.5">
      <Skeleton className="aspect-[4/5] w-full" />
      <Skeleton className="h-4 w-3/4 rounded-full" />
      <Skeleton className="h-3 w-1/3 rounded-full" />
    </View>
  );
}

export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View className="flex-row flex-wrap px-2.5">
      {Array.from({ length: count }, (_, i) => (
        <View key={i} className="w-1/2">
          <ProductCardSkeleton />
        </View>
      ))}
    </View>
  );
}
