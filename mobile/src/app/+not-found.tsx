import { router } from "expo-router";
import { View } from "react-native";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";

export default function NotFound() {
  return (
    <View className="flex-1 bg-bg">
      <EmptyState icon="compass-outline" title="Page not found" body="That link doesn't lead anywhere in the app.">
        <Button title="Go to the shop" onPress={() => router.replace("/")} />
      </EmptyState>
    </View>
  );
}
