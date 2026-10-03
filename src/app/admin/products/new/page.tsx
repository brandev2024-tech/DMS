import type { Metadata } from "next";
import { ProductForm } from "@/components/admin/product-form";
import { getSettings } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Add product" };

export default async function NewProductPage() {
  const supabase = await createClient();
  const [{ data: categories }, settings] = await Promise.all([
    supabase.from("categories").select("id, name").order("sort_order"),
    getSettings(),
  ]);
  return <ProductForm categories={categories ?? []} currencySymbol={settings.currency_symbol} />;
}
