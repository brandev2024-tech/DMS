import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { Link, router } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProductCard } from "@/components/product";
import { SocialLinks } from "@/components/social";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Eyebrow, Heading, Text } from "@/components/ui/text";
import { fetchFeatured, fetchNewest, qk } from "@/lib/api";
import { useCategories, useSettings } from "@/lib/hooks";
import { imageUrl } from "@/lib/images";
import { useColors } from "@/lib/theme";
import type { Product, ShopSettings } from "@/lib/types";

const STEPS = [
  { icon: "search-outline", title: "Browse", body: "Find a piece you love and pick your size and colour." },
  { icon: "chatbubble-ellipses-outline", title: "Message us", body: "Tap Messenger, Instagram or Direct Ask. Your inquiry is pre-written." },
  { icon: "checkmark-circle-outline", title: "Confirm", body: "We reply with price, availability, payment and delivery." },
] as const;

function Carousel({ title, eyebrow, products, money, loading }: { title: string; eyebrow: string; products?: Product[]; money: ShopSettings; loading: boolean }) {
  if (!loading && !products?.length) return null;
  return (
    <View className="mt-10">
      <View className="mb-4 flex-row items-end justify-between px-5">
        <View>
          <Eyebrow>{eyebrow}</Eyebrow>
          <Heading className="mt-1">{title}</Heading>
        </View>
        <Link href="/shop" className="pb-1">
          <Text className="text-[13px] text-muted underline">View all</Text>
        </Link>
      </View>
      {loading ? (
        <View className="flex-row gap-3 px-5">
          <Skeleton className="h-[230px] w-[170px]" />
          <Skeleton className="h-[230px] w-[170px]" />
          <Skeleton className="h-[230px] w-[100px]" />
        </View>
      ) : (
        <FlatList
          horizontal
          data={products}
          keyExtractor={(p) => p.id}
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-3 px-5"
          renderItem={({ item }) => <ProductCard product={item} money={money} width={170} />}
        />
      )}
    </View>
  );
}

export default function Home() {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const queryClient = useQueryClient();
  const settings = useSettings();
  const { data: categories } = useCategories();
  const featured = useQuery({ queryKey: qk.featured, queryFn: fetchFeatured });
  const newest = useQuery({ queryKey: qk.newest, queryFn: () => fetchNewest() });
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  };

  const hero = imageUrl(settings.hero_image_key) ?? imageUrl(featured.data?.[0]?.images?.[0]?.r2_key);

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.rose} colors={[c.rose]} />}
    >
      {/* Hero */}
      <View style={{ paddingTop: insets.top }} className="bg-blush">
        <View className="flex-row items-center justify-between px-5 py-3">
          <Text className="font-serif text-[28px] tracking-[3px]">{settings.shop_name}</Text>
          <Pressable accessibilityLabel="Search" onPress={() => router.push("/shop?focus=search")} hitSlop={10}>
            <Icon name="search-outline" size={22} />
          </Pressable>
        </View>
        <View className="mx-5 mb-6 aspect-[4/5] overflow-hidden rounded-[28px] bg-rose/30">
          {hero ? <Image source={hero} alt="" style={{ width: "100%", height: "100%" }} contentFit="cover" transition={300} /> : null}
          <View className="absolute inset-x-0 bottom-0 bg-black/25 p-6 pt-16">
            <Animated.View entering={FadeInDown.duration(600)}>
              <Text className="font-medium text-[11px] uppercase tracking-[2px] text-white/90">{settings.tagline}</Text>
              <Text className="mt-2 font-serif text-[40px] leading-[42px] text-white">{settings.hero_headline}</Text>
              {settings.hero_subtext ? <Text className="mt-2 text-[14px] text-white/90">{settings.hero_subtext}</Text> : null}
              <View className="mt-5 flex-row">
                <Button title="Shop the collection" icon="arrow-forward" onPress={() => router.push("/shop")} variant="light" />
              </View>
            </Animated.View>
          </View>
        </View>
      </View>

      {/* Categories */}
      {categories?.length ? (
        <View className="mt-8">
          <View className="mb-4 px-5">
            <Eyebrow>Categories</Eyebrow>
            <Heading className="mt-1">Shop by style</Heading>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3 px-5">
            {categories.map((cat) => (
              <Pressable
                key={cat.id}
                accessibilityRole="link"
                onPress={() => router.push(`/shop?category=${cat.slug}`)}
                className="w-[120px] active:opacity-80"
              >
                <View className="aspect-square overflow-hidden rounded-full bg-blush">
                  {cat.cover_image_key ? (
                    <Image source={imageUrl(cat.cover_image_key, "thumb")} alt={cat.name} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={200} />
                  ) : (
                    <View className="flex-1 items-center justify-center">
                      <Text className="font-serif text-3xl text-rose-ink">{cat.name.charAt(0)}</Text>
                    </View>
                  )}
                </View>
                <Text className="mt-2 text-center text-[13px]" numberOfLines={1}>
                  {cat.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <Carousel eyebrow="Handpicked" title="Featured" products={featured.data} money={settings} loading={featured.isPending} />
      <Carousel eyebrow="Just in" title="New arrivals" products={newest.data} money={settings} loading={newest.isPending} />

      {/* How to order */}
      <View className="mx-5 mt-12 rounded-[28px] bg-blush p-6">
        <Eyebrow>No checkout needed</Eyebrow>
        <Heading className="mt-1">How to order</Heading>
        {settings.how_to_order ? <Text className="mt-2 text-muted">{settings.how_to_order}</Text> : null}
        <View className="mt-5 gap-4">
          {STEPS.map((s, i) => (
            <View key={s.title} className="flex-row gap-4">
              <View className="h-11 w-11 items-center justify-center rounded-full bg-surface">
                <Icon name={s.icon} size={20} color="rose-ink" />
              </View>
              <View className="flex-1">
                <Text className="font-medium">
                  {i + 1}. {s.title}
                </Text>
                <Text className="mt-0.5 text-[13px] text-muted">{s.body}</Text>
              </View>
            </View>
          ))}
        </View>
        <Pressable onPress={() => router.push("/drop-offs")} className="mt-5 flex-row items-center gap-2 active:opacity-70">
          <Icon name="location-outline" size={16} color="rose-ink" />
          <Text className="text-[13px] text-rose-ink underline">Drop-off points & shipping ({settings.couriers.join(", ")})</Text>
        </Pressable>
      </View>

      {/* Social */}
      <View className="mt-10 px-5">
        <Eyebrow>Say hi</Eyebrow>
        <Heading className="mb-4 mt-1">Follow {settings.shop_name}</Heading>
        <SocialLinks settings={settings} />
      </View>
    </ScrollView>
  );
}
