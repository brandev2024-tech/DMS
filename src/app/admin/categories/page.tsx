import type { Metadata } from "next";
import { CategoryManager } from "@/components/admin/category-manager";
import { createClient } from "@/lib/supabase/server";
import type { Category } from "@/lib/types";

export const metadata: Metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
  const supabase = await createClient();
  const [{ data: categories }, { data: products }] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order").order("name"),
    supabase.from("products").select("category_id"),
  ]);
  const counts: Record<string, number> = {};
  for (const p of products ?? []) if (p.category_id) counts[p.category_id] = (counts[p.category_id] ?? 0) + 1;

  return (
    <div className="mx-auto max-w-3xl">
      <p className="eyebrow">Catalog</p>
      <h1 className="mt-1 text-3xl sm:text-4xl">Categories</h1>
      <p className="mb-6 mt-2 text-sm text-muted">The first category is featured largest on the home page. Use the arrows to reorder.</p>
      <CategoryManager initial={(categories ?? []) as Category[]} counts={counts} />
    </div>
  );
}
