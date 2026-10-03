import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export default function EditProfile() {
  const { userId, profile, refreshProfile } = useAuth();
  const toast = useToast();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [filledFrom, setFilledFrom] = useState<typeof profile>(null);
  if (profile && profile !== filledFrom) {
    setFilledFrom(profile);
    setName(profile.full_name ?? "");
    setPhone(profile.phone ?? "");
    setAddress(profile.address ?? "");
  }

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: name.trim() || null, phone: phone.trim() || null, address: address.trim() || null })
      .eq("id", userId);
    setSaving(false);
    if (error) return toast(error.message);
    refreshProfile();
    toast("Profile saved");
    router.back();
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-bg" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerClassName="gap-4 p-6" keyboardShouldPersistTaps="handled">
        <Text className="text-muted">We only use these to arrange your orders and deliveries.</Text>
        <Input label="Full name" value={name} onChangeText={setName} autoComplete="name" />
        <Input label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" placeholder="09XX XXX XXXX" />
        <Input label="Delivery address" value={address} onChangeText={setAddress} multiline autoComplete="street-address" />
        <Button title="Save" loading={saving} onPress={save} className="mt-2" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
