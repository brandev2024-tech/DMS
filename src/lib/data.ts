import "server-only";

import { cache } from "react";
import { DEFAULT_SETTINGS } from "./defaults";
import { DEMO_CATEGORIES, DEMO_DROP_POINTS, DEMO_PRODUCTS, DEMO_SETTINGS } from "./demo-data";
import { isSupabaseConfigured } from "./supabase/config";
import { createClient } from "./supabase/server";
import type { Category, DropPoint, Product, ProductImage, Profile, ShopSettings } from "./types";

export const getSettings = cache(async (): Promise<ShopSettings> => {
  if (!isSupabaseConfigured) return DEMO_SETTINGS;
  const supabase = await createClient();
  const { data } = await supabase.from("shop_settings").select("*").eq("id", 1).maybeSingle();
  return data
    ? { ...DEFAULT_SETTINGS, ...data, other_links: data.other_links ?? [], couriers: data.couriers ?? DEFAULT_SETTINGS.couriers }
    : DEFAULT_SETTINGS;
});

export const getCategories = cache(async (): Promise<Category[]> => {
  if (!isSupabaseConfigured) return DEMO_CATEGORIES;
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .eq("is_visible", true)
    .order("sort_order")
    .order("name");
  return data ?? [];
});

/** Attach images + category to rows from the public_products view. */
async function hydrate(rows: Omit<Product, "images" | "category">[]): Promise<Product[]> {
  if (!rows.length) return [];
  const supabase = await createClient();
  const [{ data: images }, categories] = await Promise.all([
    supabase
      .from("product_images")
      .select("*")
      .in(
        "product_id",
        rows.map((r) => r.id),
      )
      .order("sort_order"),
    getCategories(),
  ]);
  const byProduct = new Map<string, ProductImage[]>();
  for (const img of (images ?? []) as ProductImage[]) {
    const list = byProduct.get(img.product_id) ?? [];
    list.push(img);
    byProduct.set(img.product_id, list);
  }
  const catById = new Map(categories.map((c) => [c.id, c]));
  return rows.map((r) => {
    const c = r.category_id ? catById.get(r.category_id) : undefined;
    return {
      ...r,
      price: r.price == null ? null : Number(r.price),
      sale_price: r.sale_price == null ? null : Number(r.sale_price),
      images: byProduct.get(r.id) ?? [],
      category: c ? { id: c.id, name: c.name, slug: c.slug } : null,
    };
  });
}

type ProductQuery = {
  categoryId?: string;
  featured?: boolean;
  limit?: number;
  excludeId?: string;
  ids?: string[];
};

/** Demo mode: the same filters applied to the built-in sample products. */
function demoProducts(q: ProductQuery) {
  let list = DEMO_PRODUCTS.filter(
    (p) =>
      (!q.categoryId || p.category_id === q.categoryId) &&
      (!q.featured || p.is_featured) &&
      p.id !== q.excludeId &&
      (!q.ids || q.ids.includes(p.id)),
  );
  if (q.limit) list = list.slice(0, q.limit);
  return list;
}

export async function getProducts(q: ProductQuery = {}): Promise<Product[]> {
  if (!isSupabaseConfigured) return demoProducts(q);
  const supabase = await createClient();
  let query = supabase.from("public_products").select("*").order("created_at", { ascending: false });
  if (q.categoryId) query = query.eq("category_id", q.categoryId);
  if (q.featured) query = query.eq("is_featured", true);
  if (q.excludeId) query = query.neq("id", q.excludeId);
  if (q.ids) query = query.in("id", q.ids.length ? q.ids : ["00000000-0000-0000-0000-000000000000"]);
  if (q.limit) query = query.limit(q.limit);
  const { data } = await query;
  return hydrate(data ?? []);
}

export const getProductBySlug = cache(async (slug: string): Promise<Product | null> => {
  if (!isSupabaseConfigured) return DEMO_PRODUCTS.find((p) => p.slug === slug) ?? null;
  const supabase = await createClient();
  const { data } = await supabase.from("public_products").select("*").eq("slug", slug).maybeSingle();
  if (!data) return null;
  const [product] = await hydrate([data]);
  return product;
});

export const getCurrentUser = cache(async (): Promise<{ id: string; email: string | null; profile: Profile | null } | null> => {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
  return { id: data.user.id, email: data.user.email ?? null, profile: profile ?? null };
});

/** Active drop-off points & partners, in the admin's order. Empty if the table isn't migrated yet. */
export const getDropPoints = cache(async (): Promise<DropPoint[]> => {
  if (!isSupabaseConfigured) return DEMO_DROP_POINTS;
  const supabase = await createClient();
  const { data } = await supabase.from("drop_points").select("*").eq("is_active", true).order("sort_order").order("name");
  return (data ?? []) as DropPoint[];
});
