import { Link } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { SocialSignIn } from "@/components/auth-buttons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heading, Text } from "@/components/ui/text";
import { useToast } from "@/components/ui/toast";
import { signInWithPassword } from "@/lib/auth";
import { leaveAuth } from "@/lib/nav";

export default function Login() {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithPassword(email, password);
      toast("Welcome back 💕");
      leaveAuth();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't log in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-bg" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerClassName="gap-4 p-6" keyboardShouldPersistTaps="handled">
        <View className="mb-2">
          <Heading>Log in to DMS</Heading>
          <Text className="mt-1 text-muted">Same account as the website.</Text>
        </View>
        <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" />
        <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" textContentType="password" onSubmitEditing={submit} />
        {error ? <Text className="text-[13px] text-red-500">{error}</Text> : null}
        <Button title="Log in" loading={loading} disabled={!email || !password} onPress={submit} />
        <Link href="/forgot-password" className="self-center py-1">
          <Text className="text-[13px] text-muted underline">Forgot password?</Text>
        </Link>
        <SocialSignIn onDone={leaveAuth} onError={setError} />
        <View className="mt-4 flex-row justify-center gap-1">
          <Text className="text-[13px] text-muted">New here?</Text>
          <Link href="/register" replace>
            <Text className="text-[13px] font-medium text-rose-ink">Create an account</Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
