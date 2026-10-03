import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { FlatList, Pressable, ScrollView, Share, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { InquirySheet } from "@/components/inquiry";
import { Badges, FavoriteButton, Price, ProductCard } from "@/components/product";
import { Button, IconButton } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Chip, EmptyState } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/skeleton";
import { Eyebrow, Heading, Text } from "@/components/ui/text";
import { PhotoViewer } from "@/components/zoom";
import { fetchProduct, fetchRelated, qk, recordView } from "@/lib/api";
import { hasInstagram, hasMessenger } from "@/lib/dm";
import { productUrl } from "@/lib/env";
import { sortImages, STOCK_LABEL } from "@/lib/format";
import { useSettings } from "@/lib/hooks";
import { imageUrl } from "@/lib/images";
import type { DmChannel } from "@/lib/types";

export default function ProductScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const settings = useSettings();
  const { data: product, isPending } = useQuery({ queryKey: qk.product(slug), queryFn: () => fetchProduct(slug) });
  const { data: related } = useQuery({
    queryKey: qk.related(product?.id ?? ""),
    enabled: Boolean(product),
    queryFn: () => fetchRelated(product!),
  });

  const [page, setPage] = useState(0);
  const [viewer, setViewer] = useState<number | null>(null);
  const [pickedSize, setSize] = useState<string | null>(null);
  const [pickedColor, setColor] = useState<string | null>(null);
  // The only option is always selected.
  const size = product?.sizes.length === 1 ? product.sizes[0] : pickedSize;
  const color = product?.colors.length === 1 ? product.colors[0] : pickedColor;
  const [channel, setChannel] = useState<DmChannel | null>(null);
  const viewed = useRef(false);

  useEffect(() => {
    if (product && !viewed.current) {
      viewed.current = true;
      recordView(product.slug);
    }
  }, [product]);


  const back = () => (router.canGoBack() ? router.back() : router.replace("/"));

  if (isPending) {
    return (
      <View className="flex-1 bg-bg">
        <Skeleton className="aspect-[4/5] w-full rounded-none" />
        <View className="gap-3 p-5">
          <Skeleton className="h-8 w-2/3 rounded-full" />
          <Skeleton className="h-5 w-1/3 rounded-full" />
          <Skeleton className="h-24 w-full" />
        </View>
      </View>
    );
  }
  if (!product) {
    return (
      <View style={{ paddingTop: insets.top }} className="flex-1 bg-bg">
        <IconButton name="chevron-back" label="Back" onPress={back} className="ml-4" />
        <EmptyState icon="search-outline" title="Piece not found" body="It may have sold out or been taken down.">
          <Button title="Back to the shop" onPress={() => router.replace("/shop")} />
        </EmptyState>
      </View>
    );
  }

  const images = sortImages(product.images);
  const uris = images.map((i) => imageUrl(i.r2_key)!).filter(Boolean);
  const showMessenger = hasMessenger(settings);
  const showInstagram = hasInstagram(settings);
  const soldOut = product.stock_status === "sold_out";

  const share = () => Share.share({ message: `${product.name} — ${productUrl(product.slug)}`, url: productUrl(product.slug) });

  return (
    <View className="flex-1 bg-bg">
      <ScrollView contentContainerStyle={{ paddingBottom: 140 + insets.bottom }}>
        {/* Gallery */}
        <View>
          {uris.length ? (
            <FlatList
              data={uris}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(u, i) => `${i}-${u}`}
              onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
              renderItem={({ item, index }) => (
                <Pressable accessibilityLabel="Open photo full screen" onPress={() => setViewer(index)}>
                  <Image source={item} alt={`${product.name}, photo ${index + 1}`} style={{ width, height: width * 1.25 }} contentFit="cover" transition={200} cachePolicy="memory-disk" />
                </Pressable>
              )}
            />
          ) : (
            <View style={{ width, height: width * 1.25 }} className="bg-blush" />
          )}
          {uris.length > 1 ? (
            <View className="absolute bottom-4 left-0 right-0 flex-row justify-center gap-1.5">
              {uris.map((u, i) => (
                <View key={`${i}-${u}`} className={`h-1.5 rounded-full ${i === page ? "w-5 bg-white" : "w-1.5 bg-white/60"}`} />
              ))}
            </View>
          ) : null}
          <View style={{ top: insets.top + 6 }} className="absolute left-4 right-4 flex-row justify-between">
            <IconButton name="chevron-back" label="Back" onPress={back} />
            <View className="flex-row gap-2">
              <IconButton name="share-outline" label="Share" onPress={share} />
              <FavoriteButton productId={product.id} className="h-10 w-10" />
            </View>
          </View>
        </View>

        {/* Details */}
        <View className="px-5 pt-5">
          <Badges product={product} />
          {product.category ? <Eyebrow className="mt-3">{product.category.name}</Eyebrow> : null}
          <Heading className="mt-1 text-[34px]">{product.name}</Heading>
          <View className="mt-2">
            <Price product={product} money={settings} large />
          </View>
          <View className="mt-3 flex-row items-center gap-2">
            <View className={`h-2 w-2 rounded-full ${soldOut ? "bg-muted" : product.stock_status === "few_left" ? "bg-gold" : "bg-emerald-500"}`} />
            <Text className="text-[13px] text-muted">{STOCK_LABEL[product.stock_status]}</Text>
          </View>

          {product.sizes.length ? (
            <View className="mt-6">
              <Text className="mb-2 font-medium text-[13px] text-muted">Size{size ? `: ${size}` : ""}</Text>
              <View className="flex-row flex-wrap gap-2">
                {product.sizes.map((s) => (
                  <Chip key={s} label={s} active={size === s} onPress={() => setSize(size === s ? null : s)} />
                ))}
              </View>
            </View>
          ) : null}
          {product.colors.length ? (
            <View className="mt-5">
              <Text className="mb-2 font-medium text-[13px] text-muted">Color{color ? `: ${color}` : ""}</Text>
              <View className="flex-row flex-wrap gap-2">
                {product.colors.map((c) => (
                  <Chip key={c} label={c} active={color === c} onPress={() => setColor(color === c ? null : c)} />
                ))}
              </View>
            </View>
          ) : null}

          {product.description ? <Text className="mt-6 leading-6 text-ink/90">{product.description}</Text> : null}
          {product.material ? (
            <View className="mt-5 flex-row gap-2">
              <Icon name="sparkles-outline" size={16} color="gold-ink" />
              <Text className="text-[14px] text-muted">Material: {product.material}</Text>
            </View>
          ) : null}
          {settings.shipping_notes ? (
            <View className="mt-3 flex-row gap-2">
              <Icon name="cube-outline" size={16} color="gold-ink" />
              <Text className="flex-1 text-[14px] text-muted">{settings.shipping_notes}</Text>
            </View>
          ) : null}
        </View>

        {/* You may also like */}
        {related?.length ? (
          <View className="mt-10">
            <Heading className="mb-4 px-5 text-2xl">You may also like</Heading>
            <FlatList
              horizontal
              data={related}
              keyExtractor={(p) => p.id}
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-3 px-5"
              renderItem={({ item }) => <ProductCard product={item} money={settings} width={150} />}
            />
          </View>
        ) : null}
      </ScrollView>

      {/* Sticky inquiry bar */}
      <View style={{ paddingBottom: Math.max(insets.bottom, 12) }} className="absolute bottom-0 left-0 right-0 border-t border-line bg-bg/95 px-4 pt-3">
        <Text className="mb-2 text-center text-[11px] uppercase tracking-[1.5px] text-muted">
          {soldOut ? "Sold out — message us for restocks" : "Inquire in one tap"}
        </Text>
        <View className="flex-row gap-2">
          {showMessenger ? <Button title="Messenger" icon="chatbubble-ellipses-outline" small className="flex-1" onPress={() => setChannel("messenger")} /> : null}
          {showInstagram ? <Button title="Instagram" icon="logo-instagram" small variant="rose" className="flex-1" onPress={() => setChannel("instagram")} /> : null}
          <Button title="Direct Ask" icon="paper-plane-outline" small variant="outline" className="flex-1" onPress={() => setChannel("direct")} />
        </View>
      </View>

      <InquirySheet product={product} channel={channel} size={size} color={color} onClose={() => setChannel(null)} />
      <PhotoViewer key={viewer ?? -1} uris={uris} index={viewer} onClose={() => setViewer(null)} />
    </View>
  );
}
