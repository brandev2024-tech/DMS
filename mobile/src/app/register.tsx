import { Link } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { SocialSignIn } from "@/components/auth-buttons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/misc";
import { Heading, Text } from "@/components/ui/text";
import { useToast } from "@/components/ui/toast";
import { signUp } from "@/lib/auth";
import { leaveAuth } from "@/lib/nav";

export default function Register() {
  const toast = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  const submit = async () => {
    setError(null);
    if (password.length < 8) return setError("Use at least 8 characters for your password.");
    setLoading(true);
    try {
      const needsConfirm = await signUp(email, password, name);
      if (needsConfirm) setCheckEmail(true);
      else {
        toast("Welcome to DMS 💕");
        leaveAuth();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't create your account.");
    } finally {
      setLoading(false);
    }
  };

  if (checkEmail) {
    return (
      <View className="flex-1 bg-bg">
        <EmptyState icon="mail-unread-outline" title="Check your email" body={`We sent a confirmation link to ${email}. Open it on this phone to finish signing up.`}>
          <Button title="Done" onPress={leaveAuth} />
        </EmptyState>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-bg" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerClassName="gap-4 p-6" keyboardShouldPersistTaps="handled">
        <View className="mb-2">
          <Heading>Create your account</Heading>
          <Text className="mt-1 text-muted">Chat with us in Direct Ask and save favorites everywhere.</Text>
        </View>
        <Input label="Full name" value={name} onChangeText={setName} autoComplete="name" textContentType="name" />
        <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" />
        <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" textContentType="newPassword" hint="At least 8 characters." />
        {error ? <Text className="text-[13px] text-red-500">{error}</Text> : null}
        <Button title="Create account" loading={loading} disabled={!email || !password || !name} onPress={submit} />
        <SocialSignIn onDone={leaveAuth} onError={setError} />
        <View className="mt-4 flex-row justify-center gap-1">
          <Text className="text-[13px] text-muted">Already have an account?</Text>
          <Link href="/login" replace>
            <Text className="text-[13px] font-medium text-rose-ink">Log in</Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
