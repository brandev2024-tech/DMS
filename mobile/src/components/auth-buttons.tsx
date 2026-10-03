import * as AppleAuthentication from "expo-apple-authentication";
import { useEffect, useState } from "react";
import { Platform, View } from "react-native";
import { signInWithApple, signInWithGoogle } from "@/lib/auth";
import { useScheme } from "@/lib/theme";
import { Button } from "./ui/button";
import { Text } from "./ui/text";

/** Google sign-in on both platforms, plus Sign in with Apple on iOS (required by Apple). */
export function SocialSignIn({ onDone, onError }: { onDone: () => void; onError: (message: string) => void }) {
  const scheme = useScheme();
  const [busy, setBusy] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS === "ios") AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, []);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      const ok = await fn();
      if (ok !== false) onDone();
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code !== "ERR_REQUEST_CANCELED") onError(e instanceof Error ? e.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="gap-3">
      <View className="my-2 flex-row items-center gap-3">
        <View className="h-px flex-1 bg-line" />
        <Text className="text-[12px] text-muted">or</Text>
        <View className="h-px flex-1 bg-line" />
      </View>
      {appleAvailable ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={scheme === "dark" ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={24}
          style={{ height: 48 }}
          onPress={() => run(signInWithApple)}
        />
      ) : null}
      <Button title="Continue with Google" icon="logo-google" variant="outline" loading={busy} onPress={() => run(signInWithGoogle)} />
    </View>
  );
}
