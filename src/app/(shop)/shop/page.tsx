import type { Metadata } from "next";
import { Catalog } from "@/components/catalog";
import { getCategories, getProducts, getSettings } from "@/lib/data";

export const metadata: Metadata = {
  title: "Shop the Collection",
  description: "Shop cropped fur jackets, faux-fur crops, tops, dresses and more. DM us on Messenger or Instagram to order.",
  alternates: { canonical: "/shop" },
};

export default async function ShopPage({ searchParams }: PageProps<"/shop">) {
  const { q } = await searchParams;
  const [settings, categories, products] = await Promise.all([getSettings(), getCategories(), getProducts()]);

  return (
    <div className="container-page pt-8">
      <p className="eyebrow">The Collection</p>
      <h1 className="mt-1 text-4xl sm:text-5xl">Shop All</h1>
      <div className="mt-6">
        <Catalog
          products={products}
          categories={categories}
          settings={settings}
          initialQuery={typeof q === "string" ? q : ""}
        />
      </div>
    </div>
  );
}
