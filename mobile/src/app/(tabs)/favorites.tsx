import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProductCard } from "@/components/product";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { GridSkeleton } from "@/components/ui/skeleton";
import { Heading, Text } from "@/components/ui/text";
import { fetchProductsByIds, qk } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useFavorites } from "@/lib/favorites";
import { useSettings } from "@/lib/hooks";

export default function Favorites() {
  const insets = useSafeAreaInsets();
  const settings = useSettings();
  const { userId } = useAuth();
  const { ids } = useFavorites();
  const { data, isPending } = useQuery({
    queryKey: qk.byIds(ids),
    queryFn: () => fetchProductsByIds(ids),
    placeholderData: (prev) => prev?.filter((p) => ids.includes(p.id)),
  });

  return (
    <View className="flex-1 bg-bg">
      <View style={{ paddingTop: insets.top + 8 }} className="px-5 pb-3">
        <Heading>Favorites</Heading>
        <Text className="mt-1 text-[13px] text-muted">
          {userId ? "Saved to your account — also on the website." : "Saved on this phone. Log in to keep them on every device."}
        </Text>
      </View>
      {ids.length && isPending && !data ? (
        <GridSkeleton count={4} />
      ) : (
        <FlashList
          data={ids.length ? (data ?? []) : []}
          numColumns={2}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 24 }}
          renderItem={({ item }) => <ProductCard product={item} money={settings} />}
          ListEmptyComponent={
            <EmptyState icon="heart-outline" title="No favorites yet" body="Tap the heart on any piece to save it here.">
              <Button title="Browse the shop" onPress={() => router.push("/shop")} />
            </EmptyState>
          }
        />
      )}
    </View>
  );
}
