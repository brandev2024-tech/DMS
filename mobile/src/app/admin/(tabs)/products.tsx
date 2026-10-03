import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, FlatList, Pressable, RefreshControl, ScrollView, TextInput, View } from "react-native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Chip, EmptyState } from "@/components/ui/misc";
import { Heading, Text } from "@/components/ui/text";
import { useToast } from "@/components/ui/toast";
import { adminProductsKey, fetchAdminProducts } from "@/lib/admin";
import { qk } from "@/lib/api";
import { formatMoney, mainImage, STOCK_LABEL } from "@/lib/format";
import { useSettings } from "@/lib/hooks";
import { imageUrl } from "@/lib/images";
import { supabase } from "@/lib/supabase";
import { useColors } from "@/lib/theme";
import type { AdminProduct } from "@/lib/types";
import { deleteImages } from "@/lib/upload";

export default function AdminProducts() {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const toast = useToast();
  const settings = useSettings();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const { data, isPending, refetch, isRefetching } = useQuery({ queryKey: adminProductsKey, queryFn: fetchAdminProducts });

  const list = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (data?.products ?? []).filter(
      (p) => (!categoryId || p.category_id === categoryId) && (!s || p.name.toLowerCase().includes(s) || p.slug.includes(s)),
    );
  }, [data, search, categoryId]);

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: qk.admin });
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["product"] });
  };

  const toggleVisible = async (p: AdminProduct) => {
    const { error } = await supabase.from("products").update({ is_visible: !p.is_visible }).eq("id", p.id);
    if (error) return toast(error.message);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    toast(p.is_visible ? "Hidden from the shop" : "Visible in the shop");
    refreshAll();
  };

  const remove = (p: AdminProduct) =>
    Alert.alert(`Delete "${p.name}"?`, "This removes the product and its photos for good. To take it down for now, hide it instead.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const keys = p.product_images.map((i) => i.r2_key);
          const { error } = await supabase.from("products").delete().eq("id", p.id);
          if (error) return toast(error.message);
          // Duplicated products can share photos: only delete keys nothing else uses.
          if (keys.length) {
            const { data: still } = await supabase.from("product_images").select("r2_key").in("r2_key", keys);
            const used = new Set((still ?? []).map((r) => r.r2_key as string));
            deleteImages(keys.filter((k) => !used.has(k)));
          }
          toast("Product deleted");
          refreshAll();
        },
      },
    ]);

  const bulkPrice = () => {
    if (!list.length) return;
    const ids = list.map((p) => p.id);
    const apply = async (show: boolean) => {
      // A product without a price always stays "DM for Price".
      const { error } = await supabase.from("products").update({ show_price: show }).in("id", ids).not("price", "is", null);
      if (error) return toast(error.message);
      toast(show ? `Prices shown for ${ids.length} products` : `Prices hidden for ${ids.length} products`);
      refreshAll();
    };
    Alert.alert("Bulk price visibility", `Apply to the ${ids.length} product${ids.length === 1 ? "" : "s"} listed below.`, [
      { text: "Show prices", onPress: () => apply(true) },
      { text: "Hide prices (DM for Price)", onPress: () => apply(false) },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <View className="flex-1 bg-bg">
      <View style={{ paddingTop: insets.top + 8 }} className="pb-2">
        <View className="flex-row items-center justify-between px-5">
          <Heading>Products</Heading>
          <Button title="Add" icon="add" small onPress={() => router.push("/admin/product/new")} />
        </View>
        <View className="mx-5 mt-3 h-11 flex-row items-center gap-2 rounded-full border border-line bg-surface px-4">
          <Icon name="search-outline" size={18} color="muted" />
          <TextInput value={search} onChangeText={setSearch} placeholder="Search products" placeholderTextColor={c.muted} className="flex-1 font-sans text-[15px] text-ink" />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-5 pt-3">
          <Chip label="All" active={!categoryId} onPress={() => setCategoryId(null)} />
          {(data?.categories ?? []).map((cat) => (
            <Chip key={cat.id} label={cat.name} active={categoryId === cat.id} onPress={() => setCategoryId(cat.id)} />
          ))}
        </ScrollView>
        <View className="flex-row gap-4 px-5 pt-3">
          <Pressable onPress={bulkPrice} className="flex-row items-center gap-1.5 active:opacity-70">
            <Icon name="pricetag-outline" size={14} color="rose-ink" />
            <Text className="text-[13px] text-rose-ink">Bulk show/hide price</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/admin/categories")} className="flex-row items-center gap-1.5 active:opacity-70">
            <Icon name="folder-outline" size={14} color="rose-ink" />
            <Text className="text-[13px] text-rose-ink">Categories</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={list}
        keyExtractor={(p) => p.id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.rose} colors={[c.rose]} />}
        contentContainerClassName="pb-8"
        ListHeaderComponent={list.length ? <Text className="px-5 pb-1 text-[11px] text-muted">Swipe left on a product to hide or delete it.</Text> : null}
        ListEmptyComponent={
          isPending ? null : (
            <EmptyState icon="pricetags-outline" title="No products" body={search || categoryId ? "Nothing matches your search." : "Add your first piece from your phone."}>
              <Button title="Add a product" icon="add" onPress={() => router.push("/admin/product/new")} />
            </EmptyState>
          )
        }
        renderItem={({ item: p }) => {
          const img = mainImage(p.product_images);
          const price = p.price != null ? formatMoney(Number(p.sale_price ?? p.price), settings) : null;
          return (
            <ReanimatedSwipeable
              friction={2}
              rightThreshold={40}
              overshootRight={false}
              renderRightActions={() => (
                <View className="flex-row">
                  <Pressable onPress={() => toggleVisible(p)} className="w-20 items-center justify-center bg-gold">
                    <Icon name={p.is_visible ? "eye-off-outline" : "eye-outline"} size={20} color="#ffffff" />
                    <Text className="mt-1 text-[11px] text-white">{p.is_visible ? "Hide" : "Show"}</Text>
                  </Pressable>
                  <Pressable onPress={() => remove(p)} className="w-20 items-center justify-center bg-red-500">
                    <Icon name="trash-outline" size={20} color="#ffffff" />
                    <Text className="mt-1 text-[11px] text-white">Delete</Text>
                  </Pressable>
                </View>
              )}
            >
              <Pressable onPress={() => router.push(`/admin/product/${p.id}`)} className="flex-row items-center gap-3 border-b border-line bg-bg px-5 py-3 active:opacity-80">
                <View className="h-16 w-14 overflow-hidden rounded-xl bg-blush">
                  {img ? <Image source={imageUrl(img.r2_key, "thumb")} alt={p.name} style={{ width: "100%", height: "100%" }} contentFit="cover" /> : null}
                </View>
                <View className="flex-1">
                  <Text numberOfLines={1} className={p.is_visible ? "" : "text-muted"}>
                    {p.name}
                  </Text>
                  <Text className="mt-0.5 text-[12px] text-muted">
                    {price ?? "No price"}
                    {p.price != null && !p.show_price ? " (hidden · DM for Price)" : ""}
                  </Text>
                  <View className="mt-1 flex-row flex-wrap gap-1.5">
                    {!p.is_visible ? <Tag label="Hidden" /> : null}
                    {p.stock_status !== "available" ? <Tag label={STOCK_LABEL[p.stock_status]} /> : null}
                    {p.is_featured ? <Tag label="Featured" /> : null}
                    {p.is_new ? <Tag label="New" /> : null}
                    {p.is_best_seller ? <Tag label="Best Seller" /> : null}
                  </View>
                </View>
                <Icon name="chevron-forward" size={16} color="muted" />
              </Pressable>
            </ReanimatedSwipeable>
          );
        }}
      />
    </View>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <View className="rounded-full bg-blush px-2 py-0.5">
      <Text className="text-[10px] uppercase tracking-[0.5px] text-rose-ink">{label}</Text>
    </View>
  );
}
