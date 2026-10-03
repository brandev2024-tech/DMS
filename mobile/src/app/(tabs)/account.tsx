import { router } from "expo-router";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SocialLinks } from "@/components/social";
import { Button } from "@/components/ui/button";
import { Card, Row } from "@/components/ui/misc";
import { Eyebrow, Heading, Text } from "@/components/ui/text";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth";
import { PRIVACY_URL, TERMS_URL } from "@/lib/env";
import { useSettings } from "@/lib/hooks";
import { signOut } from "@/lib/push";
import { supabase } from "@/lib/supabase";

export default function Account() {
  const insets = useSafeAreaInsets();
  const settings = useSettings();
  const toast = useToast();
  const { userId, email, profile, isAdmin, setMode } = useAuth();
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = () =>
    Alert.alert(
      "Delete your account?",
      "This permanently deletes your account, favorites and Direct Ask chats. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            const { error } = await supabase.functions.invoke("delete-account", { method: "POST" });
            setDeleting(false);
            if (error) {
              let message = "Couldn't delete your account. Please try again or message us.";
              try {
                const body = await (error as { context?: Response }).context?.json();
                if (body?.error) message = body.error;
              } catch {
                // keep the generic message
              }
              Alert.alert("Not deleted", message);
              return;
            }
            await signOut();
            toast("Your account has been deleted.");
          },
        },
      ],
    );

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 40 }} contentContainerClassName="px-5">
      <Heading>Account</Heading>

      {userId ? (
        <Card className="mt-5">
          <Eyebrow>{isAdmin ? "Admin" : "Signed in"}</Eyebrow>
          <Text className="mt-1 font-serif text-2xl">{profile?.full_name || "Welcome"}</Text>
          <Text className="text-[13px] text-muted">{email}</Text>
          {isAdmin ? <Button title="Switch to Admin" icon="briefcase-outline" className="mt-4" onPress={() => setMode("admin")} /> : null}
        </Card>
      ) : (
        <Card className="mt-5">
          <Text className="font-serif text-2xl">Join DMS</Text>
          <Text className="mt-1 text-[13px] text-muted">Log in to chat with us in Direct Ask and keep your favorites on every device.</Text>
          <View className="mt-4 flex-row gap-3">
            <Button title="Log in" className="flex-1" onPress={() => router.push("/login")} />
            <Button title="Register" variant="outline" className="flex-1" onPress={() => router.push("/register")} />
          </View>
        </Card>
      )}

      {userId ? (
        <View className="mt-6">
          <Row icon="person-outline" label="Edit profile" detail="Name, phone and delivery address" onPress={() => router.push("/profile")} />
          <Row icon="notifications-outline" label="Notifications" detail="Get a ping when DMS replies" onPress={() => router.push("/notifications")} />
          <Row icon="chatbubbles-outline" label="My messages" onPress={() => router.push("/messages")} />
        </View>
      ) : null}

      <View className="mt-6">
        <Eyebrow className="mb-1">The shop</Eyebrow>
        <Row icon="location-outline" label="Drop-off points & shipping" detail={settings.couriers.join(", ")} onPress={() => router.push("/drop-offs")} />
        {settings.phone ? <Row icon="call-outline" label={settings.phone} onPress={() => Linking.openURL(`tel:${settings.phone}`)} /> : null}
        {settings.email ? <Row icon="mail-outline" label={settings.email} onPress={() => Linking.openURL(`mailto:${settings.email}`)} /> : null}
        {settings.hours ? <Row icon="time-outline" label="Hours" detail={settings.hours} /> : null}
        {settings.location ? <Row icon="storefront-outline" label="Location" detail={settings.location} /> : null}
        {settings.payment_notes ? <Row icon="card-outline" label="Payment" detail={settings.payment_notes} /> : null}
      </View>

      <View className="mt-6">
        <Eyebrow className="mb-3">Follow us</Eyebrow>
        <SocialLinks settings={settings} />
      </View>

      <View className="mt-6">
        <Row icon="shield-checkmark-outline" label="Privacy policy" onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)} />
        <Row icon="document-text-outline" label="Terms of use" onPress={() => WebBrowser.openBrowserAsync(TERMS_URL)} />
      </View>

      {userId ? (
        <View className="mt-8 gap-3">
          <Button title="Log out" variant="outline" icon="log-out-outline" onPress={() => signOut()} />
          <Button title="Delete my account" variant="danger" icon="trash-outline" loading={deleting} onPress={confirmDelete} />
        </View>
      ) : null}

      <Text className="mt-8 text-center text-[11px] text-muted">
        {settings.shop_name} — {settings.tagline}
      </Text>
    </ScrollView>
  );
}
