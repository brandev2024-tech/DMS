import { Redirect, useLocalSearchParams } from "expo-router";

/** Deep link dms://shop/<category> → the Shop tab filtered to that category. */
export default function ShopCategoryLink() {
  const { category } = useLocalSearchParams<{ category: string }>();
  return <Redirect href={`/shop?category=${encodeURIComponent(category ?? "")}`} />;
}
