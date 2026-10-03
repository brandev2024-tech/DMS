import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Catalog } from "@/components/catalog";
import { getCategories, getProducts, getSettings } from "@/lib/data";
import { imageUrl } from "@/lib/images";

export async function generateMetadata({ params }: PageProps<"/shop/[category]">): Promise<Metadata> {
  const { category } = await params;
  const cat = (await getCategories()).find((c) => c.slug === category);
  if (!cat) return { title: "Category not found" };
  return {
    title: cat.name,
    description: cat.description ?? `Shop ${cat.name} at DMS. DM us to order.`,
    alternates: { canonical: `/shop/${cat.slug}` },
    openGraph: cat.cover_image_key ? { images: [imageUrl(cat.cover_image_key)!] } : undefined,
  };
}

export default async function CategoryPage({ params }: PageProps<"/shop/[category]">) {
  const { category } = await params;
  const [settings, categories] = await Promise.all([getSettings(), getCategories()]);
  const cat = categories.find((c) => c.slug === category);
  if (!cat) notFound();
  const products = await getProducts({ categoryId: cat.id });

  return (
    <div className="container-page pt-8">
      <p className="eyebrow">Category</p>
      <h1 className="mt-1 text-4xl sm:text-5xl">{cat.name}</h1>
      {cat.description && <p className="mt-2 max-w-xl text-muted">{cat.description}</p>}
      <div className="mt-6">
        <Catalog products={products} categories={categories} settings={settings} activeCategory={cat.slug} />
      </div>
    </div>
  );
}
