import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { PhotoManager, TagInput, type PhotoItem } from "@/components/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, Chip, Toggle } from "@/components/ui/misc";
import { Text } from "@/components/ui/text";
import { useToast } from "@/components/ui/toast";
import { adminProductsKey, fetchAdminProducts } from "@/lib/admin";
import { qk } from "@/lib/api";
import { slugify } from "@/lib/format";
import { imageUrl } from "@/lib/images";
import { supabase } from "@/lib/supabase";
import type { StockStatus } from "@/lib/types";
import { deleteImages } from "@/lib/upload";

const SIZE_SUGGESTIONS = ["XS", "S", "M", "L", "XL", "Free Size"];
const STOCK: { key: StockStatus; label: string }[] = [
  { key: "available", label: "Available" },
  { key: "few_left", label: "Few Left" },
  { key: "sold_out", label: "Sold Out" },
];

const empty = {
  name: "",
  slug: "",
  description: "",
  category_id: "" as string,
  price: "",
  sale_price: "",
  show_price: true,
  sizes: [] as string[],
  colors: [] as string[],
  material: "",
  stock_status: "available" as StockStatus,
  stock_qty: "",
  is_featured: false,
  is_new: true,
  is_best_seller: false,
  is_visible: true,
};

export default function ProductEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === "new";
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({ queryKey: adminProductsKey, queryFn: fetchAdminProducts });
  const product = isNew ? null : data?.products.find((p) => p.id === id);

  const [f, setF] = useState(empty);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(isNew);
  const set = <K extends keyof typeof empty>(k: K, v: (typeof empty)[K]) => setF((prev) => ({ ...prev, [k]: v }));

  // Fill the form once the product is loaded (during render, per React docs).
  if (product && !loaded) {
    setF({
      name: product.name,
      slug: product.slug,
      description: product.description ?? "",
      category_id: product.category_id ?? "",
      price: product.price?.toString() ?? "",
      sale_price: product.sale_price?.toString() ?? "",
      show_price: product.show_price,
      sizes: product.sizes ?? [],
      colors: product.colors ?? [],
      material: product.material ?? "",
      stock_status: product.stock_status,
      stock_qty: product.stock_qty?.toString() ?? "",
      is_featured: product.is_featured,
      is_new: product.is_new,
      is_best_seller: product.is_best_seller,
      is_visible: product.is_visible,
    });
    setPhotos(
      [...product.product_images]
        .sort((a, b) => Number(b.is_main) - Number(a.is_main) || a.sort_order - b.sort_order)
        .map((i) => ({ id: i.id, key: i.r2_key, uri: imageUrl(i.r2_key, "thumb")! })),
    );
    setLoaded(true);
  }

  const uploading = photos.some((p) => p.progress !== undefined);
  const allSizes = [...new Set([...SIZE_SUGGESTIONS, ...(data?.products.flatMap((p) => p.sizes) ?? [])])];
  const allColors = [...new Set(data?.products.flatMap((p) => p.colors) ?? [])].slice(0, 12);

  const save = async () => {
    const price = f.price.trim() === "" ? null : Number(f.price);
    const sale = f.sale_price.trim() === "" ? null : Number(f.sale_price);
    if (!f.name.trim()) return Alert.alert("Missing name", "Give the product a name.");
    if (price != null && (Number.isNaN(price) || price < 0)) return Alert.alert("Check the price", "Price must be a positive number.");
    if (sale != null && (Number.isNaN(sale) || sale < 0)) return Alert.alert("Check the sale price", "Sale price must be a positive number.");
    if (sale != null && price != null && sale >= price) return Alert.alert("Check the sale price", "Sale price should be lower than the regular price.");
    if (uploading) return Alert.alert("Still uploading", "Wait for the photos to finish uploading.");

    setSaving(true);
    // Same row shape and rules as the website's product form.
    const row = {
      name: f.name.trim(),
      slug: slugify(f.slug || f.name),
      description: f.description.trim() || null,
      category_id: f.category_id || null,
      price,
      sale_price: sale,
      show_price: f.show_price && price != null,
      sizes: f.sizes,
      colors: f.colors,
      material: f.material.trim() || null,
      stock_status: f.stock_status,
      stock_qty: f.stock_qty === "" ? null : Math.max(0, parseInt(f.stock_qty, 10) || 0),
      is_featured: f.is_featured,
      is_new: f.is_new,
      is_best_seller: f.is_best_seller,
      is_visible: f.is_visible,
    };
    try {
      let productId = product?.id;
      if (productId) {
        const { error } = await supabase.from("products").update(row).eq("id", productId);
        if (error) throw error;
      } else {
        const { data: created, error } = await supabase.from("products").insert(row).select("id").single();
        if (error) throw error;
        productId = created.id as string;
      }

      const keys = photos.filter((p) => p.key && !p.failed).map((p) => p.key!);
      const { error: delErr } = await supabase.from("product_images").delete().eq("product_id", productId);
      if (delErr) throw delErr;
      if (keys.length) {
        const { error: insErr } = await supabase
          .from("product_images")
          .insert(keys.map((r2_key, i) => ({ product_id: productId, r2_key, sort_order: i, is_main: i === 0 })));
        if (insErr) throw insErr;
      }
      const removed = (product?.product_images ?? []).map((i) => i.r2_key).filter((k) => !keys.includes(k));
      if (removed.length) {
        const { data: still } = await supabase.from("product_images").select("r2_key").in("r2_key", removed);
        const used = new Set((still ?? []).map((r) => r.r2_key as string));
        deleteImages(removed.filter((k) => !used.has(k)));
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      toast(isNew ? "Product added ✨" : "Product saved ✨");
      queryClient.invalidateQueries({ queryKey: qk.admin });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product"] });
      router.back();
    } catch (e) {
      const err = e as { code?: string; message?: string };
      Alert.alert("Not saved", err.code === "23505" ? "That URL slug is already used by another product. Please change it." : (err.message ?? "Couldn't save the product."));
    } finally {
      setSaving(false);
    }
  };

  if (!isNew && (isPending || (!loaded && product))) return <ActivityIndicator className="flex-1 bg-bg" />;
  if (!isNew && !product) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <Text className="text-muted">Product not found.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-bg" behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <Stack.Screen options={{ title: isNew ? "New product" : "Edit product" }} />
      <ScrollView contentContainerClassName="gap-5 p-5 pb-32" keyboardShouldPersistTaps="handled">
        <PhotoManager items={photos} setItems={setPhotos} />

        <Card className="gap-4">
          <Input
            label="Name"
            value={f.name}
            onChangeText={(v) => {
              set("name", v);
              if (!slugTouched) set("slug", slugify(v));
            }}
            placeholder="e.g. Cloud Cropped Faux-Fur Jacket"
          />
          <Input
            label="URL slug"
            value={f.slug}
            autoCapitalize="none"
            onChangeText={(v) => {
              setSlugTouched(true);
              set("slug", slugify(v));
            }}
            hint={`Link: /product/${f.slug || "…"}`}
          />
          <Input label="Description" value={f.description} onChangeText={(v) => set("description", v)} multiline />
          <View className="gap-2">
            <Text className="font-medium text-[13px] text-muted">Category</Text>
            <View className="flex-row flex-wrap gap-2">
              <Chip label="None" active={!f.category_id} onPress={() => set("category_id", "")} />
              {(data?.categories ?? []).map((c) => (
                <Chip key={c.id} label={c.name} active={f.category_id === c.id} onPress={() => set("category_id", c.id)} />
              ))}
            </View>
          </View>
        </Card>

        <Card className="gap-4">
          <Text className="font-medium">Price (optional)</Text>
          <View className="flex-row gap-3">
            <Input className="flex-1" label="Price" value={f.price} onChangeText={(v) => set("price", v.replace(/[^\d.]/g, ""))} keyboardType="decimal-pad" placeholder="Leave blank = DM for Price" />
            <Input className="flex-1" label="Sale price" value={f.sale_price} onChangeText={(v) => set("sale_price", v.replace(/[^\d.]/g, ""))} keyboardType="decimal-pad" />
          </View>
          <Toggle
            label="Show price to shoppers"
            detail={f.show_price ? "Shoppers see the price." : "Private: shoppers see “DM for Price 💌”, only you see the price."}
            value={f.show_price}
            onChange={(v) => set("show_price", v)}
          />
        </Card>

        <Card className="gap-4">
          <TagInput label="Sizes" values={f.sizes} onChange={(v) => set("sizes", v)} suggestions={allSizes} />
          <TagInput label="Colors" values={f.colors} onChange={(v) => set("colors", v)} suggestions={allColors} />
          <Input label="Material" value={f.material} onChangeText={(v) => set("material", v)} placeholder="e.g. Faux fur, satin lining" />
        </Card>

        <Card className="gap-4">
          <Text className="font-medium">Stock</Text>
          <View className="flex-row flex-wrap gap-2">
            {STOCK.map((s) => (
              <Chip key={s.key} label={s.label} active={f.stock_status === s.key} onPress={() => set("stock_status", s.key)} />
            ))}
          </View>
          <Input label="Quantity (optional, only you see it)" value={f.stock_qty} onChangeText={(v) => set("stock_qty", v.replace(/\D/g, ""))} keyboardType="number-pad" />
        </Card>

        <Card>
          <Toggle label="Visible in the shop" detail="Hidden products are only seen by you." value={f.is_visible} onChange={(v) => set("is_visible", v)} />
          <Toggle label="Featured" detail="Shows in the Featured carousel on Home." value={f.is_featured} onChange={(v) => set("is_featured", v)} />
          <Toggle label="New badge" value={f.is_new} onChange={(v) => set("is_new", v)} />
          <Toggle label="Best Seller badge" value={f.is_best_seller} onChange={(v) => set("is_best_seller", v)} />
        </Card>

        <Button title={isNew ? "Add product" : "Save changes"} loading={saving} disabled={uploading} onPress={save} />
        {uploading ? <Text className="text-center text-[12px] text-muted">Uploading photos…</Text> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
