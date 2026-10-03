import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { exchangeCode } from "@/lib/auth";

/** Email-confirmation links and Google sign-in land here (dms://auth-callback?code=…). */
export default function AuthCallback() {
  const { code, error_description } = useLocalSearchParams<{ code?: string; error_description?: string }>();
  const [error, setError] = useState<string | null>(error_description ?? null);

  useEffect(() => {
    if (!code) {
      if (!error_description) router.replace("/");
      return;
    }
    exchangeCode(code)
      .then(() => router.replace("/"))
      .catch((e) => setError(e instanceof Error ? e.message : "This link is invalid or expired."));
  }, [code, error_description]);

  if (error) {
    return (
      <View className="flex-1 bg-bg">
        <EmptyState icon="alert-circle-outline" title="Couldn't sign you in" body={error}>
          <Button title="Back to the app" onPress={() => router.replace("/")} />
        </EmptyState>
      </View>
    );
  }
  return <ActivityIndicator className="flex-1 bg-bg" />;
}
