import { qk } from "./api";
import { supabase } from "./supabase";
import type { AdminProduct, Category } from "./types";

export const adminProductsKey = [...qk.admin, "products"] as const;
export const adminCategoriesKey = [...qk.admin, "categories"] as const;

/** Admin reads the base tables (RLS lets only admins do this), including hidden items and private prices. */
export async function fetchAdminProducts() {
  const [{ data: products, error }, { data: categories }] = await Promise.all([
    supabase.from("products").select("*, product_images(*)").order("created_at", { ascending: false }),
    supabase.from("categories").select("*").order("sort_order").order("name"),
  ]);
  if (error) throw error;
  return { products: (products ?? []) as AdminProduct[], categories: (categories ?? []) as Category[] };
}

