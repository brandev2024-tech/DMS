import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView } from "react-native";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heading, Text } from "@/components/ui/text";
import { useToast } from "@/components/ui/toast";
import { exchangeCode, useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

/** Opened from the password-reset email (dms://reset-password?code=…). */
export default function ResetPassword() {
  const { code, error_description } = useLocalSearchParams<{ code?: string; error_description?: string }>();
  const toast = useToast();
  const { userId } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(error_description ?? null);
  const [loading, setLoading] = useState(false);
  const [exchanging, setExchanging] = useState(Boolean(code));

  useEffect(() => {
    if (!code) return;
    exchangeCode(code)
      .catch((e) => setError(e instanceof Error ? e.message : "This reset link is invalid or expired."))
      .finally(() => setExchanging(false));
  }, [code]);

  const submit = async () => {
    setError(null);
    if (password.length < 8) return setError("Use at least 8 characters.");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return setError(error.message);
    toast("Password updated 💕");
    router.replace("/account");
  };

  if (exchanging) return <ActivityIndicator className="flex-1 bg-bg" />;

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerClassName="gap-4 p-6" keyboardShouldPersistTaps="handled">
      <Heading>Choose a new password</Heading>
      {!userId ? (
        <Text className="text-muted">Open the reset link from your email on this phone to continue.</Text>
      ) : (
        <>
          <Input label="New password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" textContentType="newPassword" hint="At least 8 characters." />
          <Button title="Save password" loading={loading} disabled={!password} onPress={submit} />
        </>
      )}
      {error ? <Text className="text-[13px] text-red-500">{error}</Text> : null}
    </ScrollView>
  );
}
