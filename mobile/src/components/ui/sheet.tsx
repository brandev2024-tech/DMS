import type { ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemeRoot } from "@/lib/theme";
import { IconButton } from "./button";
import { Heading } from "./text";

/** Bottom sheet: slides up; tap outside, the close button or Android back closes it. */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <ThemeRoot transparent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 justify-end">
          <Pressable accessibilityLabel="Close" onPress={onClose} className="absolute inset-0 bg-black/40" />
          <View className="max-h-[90%] rounded-t-[28px] bg-bg" style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
            <View className="items-center pt-2.5">
              <View className="h-1 w-10 rounded-full bg-line" />
            </View>
            <View className="flex-row items-center justify-between px-5 pb-1 pt-2">
              <Heading className="flex-1 text-2xl">{title}</Heading>
              <IconButton name="close" label="Close" onPress={onClose} className="bg-blush" />
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="px-5 pb-4">
              {children}
            </ScrollView>
            {footer ? <View className="border-t border-line px-5 pt-3">{footer}</View> : null}
          </View>
        </KeyboardAvoidingView>
      </ThemeRoot>
    </Modal>
  );
}
