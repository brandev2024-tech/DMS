import { forwardRef } from "react";
import { TextInput, type TextInputProps, View } from "react-native";
import { useColors } from "@/lib/theme";
import { Text } from "./text";

type Props = TextInputProps & { label?: string; hint?: string; className?: string };

export const Input = forwardRef<TextInput, Props>(function Input({ label, hint, className = "", multiline, ...props }, ref) {
  const colors = useColors();
  return (
    <View className={`gap-1.5 ${className}`}>
      {label ? <Text className="font-medium text-[13px] text-muted">{label}</Text> : null}
      <TextInput
        ref={ref}
        placeholderTextColor={colors.muted}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        className={`rounded-2xl border border-line bg-surface px-4 font-sans text-[15px] text-ink ${multiline ? "min-h-[96px] py-3" : "h-12"}`}
        {...props}
      />
      {hint ? <Text className="text-[12px] text-muted">{hint}</Text> : null}
    </View>
  );
});
