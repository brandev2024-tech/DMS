import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { Link } from "expo-router";
import { memo } from "react";
import { Pressable, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from "react-native-reanimated";
import { formatMoney, mainImage, priceLabel } from "@/lib/format";
import { useFavorites } from "@/lib/favorites";
import { imageUrl } from "@/lib/images";
import type { Product, ShopSettings } from "@/lib/types";
import { Icon } from "./ui/icon";
import { Text } from "./ui/text";

type Money = Pick<ShopSettings, "currency_code" | "currency_symbol">;

/** Price, sale price with the old one crossed out, or "DM for Price 💌". */
export function Price({ product, money, large }: { product: Pick<Product, "price" | "sale_price" | "show_price">; money: Money; large?: boolean }) {
  const label = priceLabel(product, money);
  if (!label) return <Text className={`font-medium text-rose-ink ${large ? "text-lg" : "text-[13px]"}`}>DM for Price 💌</Text>;
  const onSale = product.sale_price != null && product.price != null && product.sale_price < product.price;
  return (
    <View className="flex-row items-baseline gap-2">
      <Text className={`font-medium ${large ? "text-xl" : "text-[14px]"} ${onSale ? "text-rose-ink" : ""}`}>{label}</Text>
      {onSale ? (
        <Text className={`text-muted line-through ${large ? "text-[15px]" : "text-[12px]"}`}>{formatMoney(product.price!, money)}</Text>
      ) : null}
    </View>
  );
}

export function Badges({ product, className = "" }: { product: Product; className?: string }) {
  const list: { label: string; tone: string }[] = [];
  if (product.stock_status === "sold_out") list.push({ label: "Sold Out", tone: "bg-ink text-on-ink" });
  else if (product.stock_status === "few_left") list.push({ label: "Few Left", tone: "bg-gold text-white" });
  if (product.is_new) list.push({ label: "New", tone: "bg-surface text-ink" });
  if (product.is_best_seller) list.push({ label: "Best Seller", tone: "bg-rose text-white" });
  if (!list.length) return null;
  return (
    <View className={`flex-row flex-wrap gap-1 ${className}`}>
      {list.map((b) => {
        const [bg, fg] = b.tone.split(" ");
        return (
          <View key={b.label} className={`rounded-full px-2.5 py-1 ${bg}`}>
            <Text className={`font-medium text-[10px] uppercase tracking-[1px] ${fg}`}>{b.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

export function FavoriteButton({ productId, className = "" }: { productId: string; className?: string }) {
  const { has, toggle } = useFavorites();
  const on = has(productId);
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={on ? "Remove from favorites" : "Add to favorites"}
      hitSlop={10}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        scale.set(withSequence(withSpring(1.25, { damping: 8 }), withSpring(1)));
        toggle(productId);
      }}
      className={`h-9 w-9 items-center justify-center rounded-full bg-surface/90 ${className}`}
    >
      <Animated.View style={style}>
        <Icon name={on ? "heart" : "heart-outline"} size={18} color={on ? "rose-ink" : "ink"} />
      </Animated.View>
    </Pressable>
  );
}

/** Grid / carousel card linking to the product page. */
export const ProductCard = memo(function ProductCard({ product, money, width }: { product: Product; money: Money; width?: number }) {
  const img = mainImage(product.images);
  return (
    <View style={width ? { width } : undefined} className={width ? "" : "flex-1 p-1.5"}>
      <Link href={`/product/${product.slug}`} asChild>
        <Pressable accessibilityRole="link" accessibilityLabel={product.name} className="active:opacity-80">
          <View className="aspect-[4/5] w-full overflow-hidden rounded-2xl bg-blush">
            <Image
              source={imageUrl(img?.r2_key, "thumb")}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
              recyclingKey={product.id}
              alt={product.name}
            />
            <Badges product={product} className="absolute left-2 top-2 right-12" />
            {product.stock_status === "sold_out" ? <View className="absolute inset-0 bg-white/30" /> : null}
          </View>
          <View className="gap-0.5 px-0.5 pt-2.5">
            <Text className="text-[14px]" numberOfLines={1}>
              {product.name}
            </Text>
            <Price product={product} money={money} />
          </View>
        </Pressable>
      </Link>
      <FavoriteButton productId={product.id} className={`absolute top-2 ${width ? "right-2" : "right-3.5 top-3.5"}`} />
    </View>
  );
});
