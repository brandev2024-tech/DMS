import { useState } from "react";
import { ScrollView, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/misc";
import { Heading, Text } from "@/components/ui/text";
import { sendPasswordReset } from "@/lib/auth";
import { leaveAuth } from "@/lib/nav";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send the email.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <View className="flex-1 bg-bg">
        <EmptyState icon="mail-unread-outline" title="Check your email" body="Open the reset link on this phone — it brings you back to the app to choose a new password.">
          <Button title="Done" onPress={leaveAuth} />
        </EmptyState>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerClassName="gap-4 p-6" keyboardShouldPersistTaps="handled">
      <Heading>Forgot your password?</Heading>
      <Text className="text-muted">Enter your email and we&apos;ll send you a link to set a new one.</Text>
      <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      {error ? <Text className="text-[13px] text-red-500">{error}</Text> : null}
      <Button title="Send reset link" loading={loading} disabled={!email} onPress={submit} />
    </ScrollView>
  );
}
