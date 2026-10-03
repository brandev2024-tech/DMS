import { Image } from "expo-image";
import { useState } from "react";
import { Alert, Pressable, TextInput, useWindowDimensions, View } from "react-native";
import Sortable from "react-native-sortables";
import { useColors } from "@/lib/theme";
import { pickImages, uploadImage, type PickedImage, type UploadKind } from "@/lib/upload";
import { Icon } from "./ui/icon";
import { Text } from "./ui/text";

/** Chips with an "add" field, for sizes and colours. */
export function TagInput({ label, values, onChange, suggestions = [] }: { label: string; values: string[]; onChange: (v: string[]) => void; suggestions?: string[] }) {
  const c = useColors();
  const [draft, setDraft] = useState("");
  const add = (v: string) => {
    const t = v.trim();
    if (t && !values.some((x) => x.toLowerCase() === t.toLowerCase())) onChange([...values, t]);
    setDraft("");
  };
  const unused = suggestions.filter((s) => !values.includes(s));
  return (
    <View className="gap-2">
      <Text className="font-medium text-[13px] text-muted">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {values.map((v) => (
          <Pressable key={v} onPress={() => onChange(values.filter((x) => x !== v))} className="flex-row items-center gap-1 rounded-full bg-ink px-3 py-1.5">
            <Text className="text-[13px] text-on-ink">{v}</Text>
            <Icon name="close" size={13} color="on-ink" />
          </Pressable>
        ))}
        {unused.map((v) => (
          <Pressable key={v} onPress={() => add(v)} className="rounded-full border border-dashed border-line px-3 py-1.5">
            <Text className="text-[13px] text-muted">+ {v}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        onSubmitEditing={() => add(draft)}
        submitBehavior="submit"
        returnKeyType="done"
        placeholder={`Add ${label.toLowerCase()} and press done`}
        placeholderTextColor={c.muted}
        className="h-11 rounded-2xl border border-line bg-surface px-4 font-sans text-[14px] text-ink"
      />
    </View>
  );
}

export type PhotoItem = { id: string; key?: string; uri: string; progress?: number; failed?: boolean };

/**
 * Product photos: add from camera/gallery (auto-cropped, compressed and uploaded to R2
 * with a progress bar), drag to reorder, star to make the main photo, × to remove.
 * The first photo is the main one (same rule as the website).
 */
export function PhotoManager({
  items,
  setItems,
  kind = "product",
  max = 10,
}: {
  items: PhotoItem[];
  setItems: (fn: (prev: PhotoItem[]) => PhotoItem[]) => void;
  kind?: UploadKind;
  max?: number;
}) {
  const { width } = useWindowDimensions();
  const size = (width - 40 - 16) / 3;

  const upload = async (picked: PickedImage[]) => {
    const fresh = picked.slice(0, Math.max(0, max - items.length)).map((p) => ({ item: { id: `${Date.now()}-${Math.random()}`, uri: p.uri, progress: 0 }, p }));
    setItems((prev) => [...prev, ...fresh.map((f) => f.item)]);
    // Two at a time keeps phones on slow mobile data responsive.
    const queue = [...fresh];
    const worker = async () => {
      for (let next = queue.shift(); next; next = queue.shift()) {
        const { item, p } = next;
        try {
          const key = await uploadImage(kind, p, (progress) => setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, progress } : x))));
          setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, key, progress: undefined } : x)));
        } catch (e) {
          setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, failed: true, progress: undefined } : x)));
          Alert.alert("Photo not uploaded", e instanceof Error ? e.message : "Please try again.");
        }
      }
    };
    await Promise.all([worker(), worker()]);
  };

  const add = () =>
    Alert.alert("Add photos", undefined, [
      { text: "Take photo", onPress: () => pickImages("camera").then(upload).catch((e) => Alert.alert("Camera", e.message)) },
      { text: "Choose from gallery", onPress: () => pickImages("library", true).then(upload).catch((e) => Alert.alert("Photos", e.message)) },
      { text: "Cancel", style: "cancel" },
    ]);

  const makeMain = (id: string) => setItems((prev) => [...prev.filter((x) => x.id === id), ...prev.filter((x) => x.id !== id)]);
  const remove = (id: string) => setItems((prev) => prev.filter((x) => x.id !== id));

  return (
    <View className="gap-2">
      <Text className="font-medium text-[13px] text-muted">Photos · drag to reorder · ★ = main photo</Text>
      {items.length ? (
        <Sortable.Grid
          data={items}
          columns={3}
          rowGap={8}
          columnGap={8}
          keyExtractor={(x) => x.id}
          onDragEnd={({ data }) => setItems(() => data)}
          renderItem={({ item, index }) => (
            <View style={{ width: size, height: size * 1.25 }} className="overflow-hidden rounded-2xl bg-blush">
              <Image source={item.uri} alt={`Photo ${index + 1}`} style={{ width: "100%", height: "100%" }} contentFit="cover" />
              {item.progress !== undefined ? (
                <View className="absolute inset-x-2 bottom-2 h-1.5 overflow-hidden rounded-full bg-white/60">
                  <View className="h-1.5 bg-rose" style={{ width: `${Math.round(item.progress * 100)}%` }} />
                </View>
              ) : null}
              {item.failed ? (
                <View className="absolute inset-0 items-center justify-center bg-black/50">
                  <Text className="text-[11px] text-white">Upload failed</Text>
                </View>
              ) : null}
              <Sortable.Touchable onTap={() => makeMain(item.id)} style={{ position: "absolute", left: 6, top: 6 }}>
                <View className={`h-7 w-7 items-center justify-center rounded-full ${index === 0 ? "bg-gold" : "bg-white/85"}`}>
                  <Icon name={index === 0 ? "star" : "star-outline"} size={14} color={index === 0 ? "#ffffff" : "#1D1A1A"} />
                </View>
              </Sortable.Touchable>
              <Sortable.Touchable onTap={() => remove(item.id)} style={{ position: "absolute", right: 6, top: 6 }}>
                <View className="h-7 w-7 items-center justify-center rounded-full bg-white/85">
                  <Icon name="close" size={15} color="#1D1A1A" />
                </View>
              </Sortable.Touchable>
            </View>
          )}
        />
      ) : null}
      {items.length < max ? (
        <Pressable onPress={add} className="h-24 flex-row items-center justify-center gap-2 rounded-2xl border border-dashed border-rose bg-blush/50 active:opacity-70">
          <Icon name="camera-outline" size={20} color="rose-ink" />
          <Text className="text-rose-ink">Add photos from camera or gallery</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Single image picker (category cover, logo, hero banner). */
export function SinglePhoto({ label, uri, kind, onChange, aspect = 1 }: { label: string; uri: string | null; kind: UploadKind; onChange: (key: string | null) => void; aspect?: number }) {
  const [progress, setProgress] = useState<number | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const pick = async (source: "camera" | "library") => {
    try {
      const [img] = await pickImages(source);
      if (!img) return;
      setPreview(img.uri);
      setProgress(0);
      const key = await uploadImage(kind, img, setProgress);
      onChange(key);
    } catch (e) {
      setPreview(null);
      Alert.alert("Photo not uploaded", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setProgress(null);
    }
  };
  const shown = preview ?? uri;
  return (
    <View className="gap-2">
      <Text className="font-medium text-[13px] text-muted">{label}</Text>
      <Pressable
        onPress={() =>
          Alert.alert(label, undefined, [
            { text: "Take photo", onPress: () => pick("camera") },
            { text: "Choose from gallery", onPress: () => pick("library") },
            ...(shown ? [{ text: "Remove", style: "destructive" as const, onPress: () => (setPreview(null), onChange(null)) }] : []),
            { text: "Cancel", style: "cancel" as const },
          ])
        }
        style={{ aspectRatio: aspect }}
        className="w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed border-rose bg-blush/50 active:opacity-80"
      >
        {shown ? (
          <Image source={shown} alt={label} style={{ width: "100%", height: "100%" }} contentFit="cover" />
        ) : (
          <View className="items-center gap-1">
            <Icon name="image-outline" size={22} color="rose-ink" />
            <Text className="text-[13px] text-rose-ink">Tap to add</Text>
          </View>
        )}
        {progress !== null ? (
          <View className="absolute inset-x-3 bottom-3 h-1.5 overflow-hidden rounded-full bg-white/60">
            <View className="h-1.5 bg-rose" style={{ width: `${Math.round(progress * 100)}%` }} />
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}
