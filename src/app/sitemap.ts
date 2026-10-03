import type { MetadataRoute } from "next";
import { getCategories, getProducts } from "@/lib/data";
import { absoluteUrl } from "@/lib/format";
import { imageUrl } from "@/lib/images";

// Always render per request: pages depend on the visitor session and live shop data.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, products] = await Promise.all([getCategories(), getProducts()]);
  return [
    { url: absoluteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/shop"), changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/delivery"), changeFrequency: "monthly", priority: 0.6 },
    ...categories.map((c) => ({ url: absoluteUrl(`/shop/${c.slug}`), changeFrequency: "weekly" as const, priority: 0.7 })),
    ...products.map((p) => ({
      url: absoluteUrl(`/product/${p.slug}`),
      lastModified: p.created_at,
      changeFrequency: "weekly" as const,
      priority: 0.8,
      images: p.images.map((i) => absoluteUrl(imageUrl(i.r2_key)!)),
    })),
  ];
}
