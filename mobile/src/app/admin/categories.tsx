import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { SinglePhoto } from "@/components/admin";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Card, Toggle } from "@/components/ui/misc";
import { Sheet } from "@/components/ui/sheet";
import { Text } from "@/components/ui/text";
import { useToast } from "@/components/ui/toast";
import { adminCategoriesKey } from "@/lib/admin";
import { qk } from "@/lib/api";
import { slugify } from "@/lib/format";
import { imageUrl } from "@/lib/images";
import { supabase } from "@/lib/supabase";
import type { Category } from "@/lib/types";
import { deleteImages } from "@/lib/upload";

type Draft = { id?: string; name: string; slug: string; description: string; cover_image_key: string | null; is_visible: boolean };
const blank: Draft = { name: "", slug: "", description: "", cover_image_key: null, is_visible: true };

export default function Categories() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const { data: list = [] } = useQuery({
    queryKey: adminCategoriesKey,
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").order("sort_order").order("name");
      return (data ?? []) as Category[];
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: qk.admin });
    queryClient.invalidateQueries({ queryKey: qk.categories });
    queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  const move = async (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    const next = list.slice();
    [next[i], next[j]] = [next[j], next[i]];
    queryClient.setQueryData(adminCategoriesKey, next);
    const results = await Promise.all(next.map((c, idx) => supabase.from("categories").update({ sort_order: idx }).eq("id", c.id)));
    if (results.some((r) => r.error)) toast("Couldn't save the new order.");
    refresh();
  };

  const remove = (c: Category) =>
    Alert.alert(`Delete "${c.name}"?`, "Products in this category stay, but become uncategorized.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.from("categories").delete().eq("id", c.id);
          if (error) return toast(error.message);
          if (c.cover_image_key) deleteImages([c.cover_image_key]);
          toast("Category deleted");
          refresh();
        },
      },
    ]);

  const save = async () => {
    if (!draft?.name.trim()) return;
    setSaving(true);
    const row = {
      name: draft.name.trim(),
      slug: slugify(draft.slug || draft.name),
      description: draft.description.trim() || null,
      cover_image_key: draft.cover_image_key,
      is_visible: draft.is_visible,
    };
    const old = list.find((c) => c.id === draft.id);
    const { error } = draft.id
      ? await supabase.from("categories").update(row).eq("id", draft.id)
      : await supabase.from("categories").insert({ ...row, sort_order: list.length });
    setSaving(false);
    if (error) return toast(error.code === "23505" ? "That slug is already used." : error.message);
    if (old?.cover_image_key && old.cover_image_key !== draft.cover_image_key) deleteImages([old.cover_image_key]);
    toast(draft.id ? "Category saved" : "Category added");
    setDraft(null);
    refresh();
  };

  return (
    <View className="flex-1 bg-bg">
      <ScrollView contentContainerClassName="gap-3 p-5 pb-12">
        <Button title="Add category" icon="add" onPress={() => setDraft(blank)} />
        {list.map((c, i) => (
          <Card key={c.id} className="flex-row items-center gap-3 p-3">
            <View className="h-14 w-14 overflow-hidden rounded-full bg-blush">
              {c.cover_image_key ? <Image source={imageUrl(c.cover_image_key, "thumb")} alt={c.name} style={{ width: "100%", height: "100%" }} contentFit="cover" /> : null}
            </View>
            <Pressable
              className="flex-1 active:opacity-70"
              onPress={() => setDraft({ id: c.id, name: c.name, slug: c.slug, description: c.description ?? "", cover_image_key: c.cover_image_key, is_visible: c.is_visible })}
            >
              <Text className={c.is_visible ? "" : "text-muted"}>{c.name}</Text>
              <Text className="text-[12px] text-muted">{c.is_visible ? `/${c.slug}` : "Hidden"}</Text>
            </Pressable>
            <View className="flex-row gap-1">
              <Pressable accessibilityLabel="Move up" onPress={() => move(i, -1)} hitSlop={6} className="p-1.5">
                <Icon name="chevron-up" size={18} color={i === 0 ? "line" : "ink"} />
              </Pressable>
              <Pressable accessibilityLabel="Move down" onPress={() => move(i, 1)} hitSlop={6} className="p-1.5">
                <Icon name="chevron-down" size={18} color={i === list.length - 1 ? "line" : "ink"} />
              </Pressable>
              <Pressable accessibilityLabel="Delete" onPress={() => remove(c)} hitSlop={6} className="p-1.5">
                <Icon name="trash-outline" size={18} color="#ef4444" />
              </Pressable>
            </View>
          </Card>
        ))}
      </ScrollView>

      <Sheet
        open={draft !== null}
        onClose={() => setDraft(null)}
        title={draft?.id ? "Edit category" : "New category"}
        footer={<Button title="Save" loading={saving} disabled={!draft?.name.trim()} onPress={save} />}
      >
        {draft ? (
          <View className="gap-4 pt-2">
            <Input label="Name" value={draft.name} onChangeText={(v) => setDraft({ ...draft, name: v, slug: draft.id ? draft.slug : slugify(v) })} />
            <Input label="Slug" value={draft.slug} autoCapitalize="none" onChangeText={(v) => setDraft({ ...draft, slug: slugify(v) })} />
            <Input label="Description" value={draft.description} onChangeText={(v) => setDraft({ ...draft, description: v })} multiline />
            <SinglePhoto label="Cover photo" uri={imageUrl(draft.cover_image_key, "thumb")} kind="category" onChange={(key) => setDraft((d) => (d ? { ...d, cover_image_key: key } : d))} aspect={4 / 5} />
            <Toggle label="Visible" detail="Hidden categories (and their products) don't show in the shop." value={draft.is_visible} onChange={(v) => setDraft({ ...draft, is_visible: v })} />
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}
