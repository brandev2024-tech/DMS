import { Image } from "expo-image";
import { useState } from "react";
import { FlatList, Modal, Pressable, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "./ui/icon";
import { Text } from "./ui/text";

/** One photo with pinch-to-zoom, pan while zoomed and double-tap to zoom in/out. */
function ZoomableImage({
  uri,
  width,
  height,
  zoomed,
  onZoomChange,
}: {
  uri: string;
  width: number;
  height: number;
  zoomed: boolean;
  onZoomChange: (zoomed: boolean) => void;
}) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);

  const clamp = (v: number, s: number, size: number) => {
    "worklet";
    const max = ((s - 1) * size) / 2;
    return Math.min(max, Math.max(-max, v));
  };

  const reset = () => {
    "worklet";
    scale.set(withTiming(1));
    savedScale.set(1);
    tx.set(withTiming(0));
    ty.set(withTiming(0));
    savedTx.set(0);
    savedTy.set(0);
  };

  const pinch = Gesture.Pinch()
    .runOnJS(true)
    .onStart(() => onZoomChange(true))
    .onUpdate((e) => {
      scale.set(Math.max(1, Math.min(4, savedScale.get() * e.scale)));
    })
    .onEnd(() => {
      savedScale.set(scale.get());
      if (scale.get() <= 1.01) {
        reset();
        onZoomChange(false);
      }
    });

  // Only pan while zoomed, so swiping between photos still works.
  const pan = Gesture.Pan()
    .enabled(zoomed)
    .averageTouches(true)
    .onUpdate((e) => {
      if (scale.get() <= 1) return;
      tx.set(clamp(savedTx.get() + e.translationX, scale.get(), width));
      ty.set(clamp(savedTy.get() + e.translationY, scale.get(), height));
    })
    .onEnd(() => {
      savedTx.set(tx.get());
      savedTy.set(ty.get());
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .runOnJS(true)
    .onEnd(() => {
      if (scale.get() > 1) {
        reset();
        onZoomChange(false);
      } else {
        scale.set(withTiming(2.5));
        savedScale.set(2.5);
        onZoomChange(true);
      }
    });

  const gesture = Gesture.Simultaneous(pinch, Gesture.Exclusive(doubleTap, pan));

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.get() }, { translateY: ty.get() }, { scale: scale.get() }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[{ width, height }, style]}>
        <Image source={uri} alt="Product photo" style={{ width, height }} contentFit="contain" />
      </Animated.View>
    </GestureDetector>
  );
}

/** Full-screen photo viewer: swipe between photos, pinch or double-tap to zoom. */
export function PhotoViewer({ uris, index, onClose }: { uris: string[]; index: number | null; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [zoomed, setZoomed] = useState(false);
  const [current, setCurrent] = useState(index ?? 0);

  return (
    <Modal visible={index !== null} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#000" }}>
        {index !== null ? (
          <FlatList
            data={uris}
            horizontal
            pagingEnabled
            scrollEnabled={!zoomed}
            initialScrollIndex={index}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(u, i) => `${i}-${u}`}
            onMomentumScrollEnd={(e) => setCurrent(Math.round(e.nativeEvent.contentOffset.x / width))}
            renderItem={({ item }) => (
              <View style={{ width, height }} className="items-center justify-center">
                <ZoomableImage uri={item} width={width} height={height * 0.85} zoomed={zoomed} onZoomChange={setZoomed} />
              </View>
            )}
          />
        ) : null}
        <View style={{ top: insets.top + 8 }} className="absolute left-0 right-0 flex-row items-center justify-between px-4">
          <Text className="text-white/80">
            {current + 1} / {uris.length}
          </Text>
          <Pressable accessibilityLabel="Close" onPress={onClose} hitSlop={10} className="h-10 w-10 items-center justify-center rounded-full bg-white/15">
            <Icon name="close" size={22} color="#ffffff" />
          </Pressable>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
