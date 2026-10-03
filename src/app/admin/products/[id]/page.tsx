import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/product-form";
import { getSettings } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { AdminProduct } from "@/lib/types";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: PageProps<"/admin/products/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: product }, { data: categories }, settings] = await Promise.all([
    supabase.from("products").select("*, product_images(*)").eq("id", id).maybeSingle(),
    supabase.from("categories").select("id, name").order("sort_order"),
    getSettings(),
  ]);
  if (!product) notFound();

  const p = product as AdminProduct;
  return (
    <ProductForm
      product={{ ...p, price: p.price == null ? null : Number(p.price), sale_price: p.sale_price == null ? null : Number(p.sale_price) }}
      categories={categories ?? []}
      currencySymbol={settings.currency_symbol}
    />
  );
}
