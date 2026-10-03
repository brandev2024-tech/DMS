import type { Metadata } from "next";
import { ProductList } from "@/components/admin/product-list";
import { getSettings } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Products" };

export default async function AdminProductsPage() {
  const supabase = await createClient();
  const [{ data: categories }, settings] = await Promise.all([
    supabase.from("categories").select("id, name").order("sort_order"),
    getSettings(),
  ]);
  return (
    <div className="mx-auto max-w-6xl">
      <p className="eyebrow">Catalog</p>
      <h1 className="mb-6 mt-1 text-3xl sm:text-4xl">Products</h1>
      <ProductList categories={categories ?? []} money={settings} />
    </div>
  );
}
