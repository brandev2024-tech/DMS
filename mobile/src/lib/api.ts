import { supabase } from "./supabase";
import type { Category, DropPoint, Product, ProductImage, ShopSettings } from "./types";

/** Same fallbacks as the website when a settings column is empty. */
export const DEFAULT_SETTINGS: ShopSettings = {
  shop_name: "DMS",
  tagline: "Direct Message Us",
  logo_key: null,
  hero_image_key: null,
  hero_headline: "Cropped. Cozy. Couture.",
  hero_subtext: "Fur & faux-fur cropped jackets, made for soft-luxe days.",
  facebook_url: null,
  facebook_enabled: false,
  messenger_username: null,
  messenger_enabled: false,
  instagram_username: null,
  instagram_enabled: false,
  tiktok_url: null,
  tiktok_enabled: false,
  other_links: [],
  phone: null,
  email: null,
  hours: null,
  location: null,
  how_to_order: null,
  payment_notes: null,
  shipping_notes: null,
  currency_code: "PHP",
  currency_symbol: "₱",
  quick_replies: [],
  couriers: ["J&T Express", "LBC"],
};

export const PAGE_SIZE = 20;

/** TanStack Query keys, so screens and mutations invalidate the same caches. */
export const qk = {
  settings: ["settings"] as const,
  categories: ["categories"] as const,
  featured: ["products", "featured"] as const,
  newest: ["products", "newest"] as const,
  shop: (f: ShopFilters) => ["products", "shop", f] as const,
  facets: ["products", "facets"] as const,
  product: (slug: string) => ["product", slug] as const,
  related: (id: string) => ["products", "related", id] as const,
  byIds: (ids: string[]) => ["products", "ids", ids] as const,
  dropPoints: ["drop-points"] as const,
  profile: (id: string) => ["profile", id] as const,
  favorites: (userId: string) => ["favorites", userId] as const,
  conversations: (scope: "mine" | "all") => ["conversations", scope] as const,
  messages: (conversationId: string) => ["messages", conversationId] as const,
  admin: ["admin"] as const,
};

function check<T>(res: { data: T; error: { message: string } | null }) {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export async function fetchSettings(): Promise<ShopSettings> {
  const data = check(await supabase.from("shop_settings").select("*").eq("id", 1).maybeSingle());
  return data
    ? { ...DEFAULT_SETTINGS, ...data, other_links: data.other_links ?? [], couriers: data.couriers ?? DEFAULT_SETTINGS.couriers }
    : DEFAULT_SETTINGS;
}

export async function fetchCategories(): Promise<Category[]> {
  return (
    check(await supabase.from("categories").select("*").eq("is_visible", true).order("sort_order").order("name")) ?? []
  );
}

type ProductRow = Omit<Product, "images" | "category">;

/** Attach images + category to rows from the public_products view. */
async function hydrate(rows: ProductRow[]): Promise<Product[]> {
  if (!rows.length) return [];
  const [images, categories] = await Promise.all([
    supabase
      .from("product_images")
      .select("*")
      .in(
        "product_id",
        rows.map((r) => r.id),
      )
      .order("sort_order")
      .then(check),
    supabase.from("categories").select("id, name, slug").then(check),
  ]);
  const byProduct = new Map<string, ProductImage[]>();
  for (const img of (images ?? []) as ProductImage[]) {
    const list = byProduct.get(img.product_id) ?? [];
    list.push(img);
    byProduct.set(img.product_id, list);
  }
  const catById = new Map((categories ?? []).map((c) => [c.id as string, c]));
  return rows.map((r) => ({
    ...r,
    price: r.price == null ? null : Number(r.price),
    sale_price: r.sale_price == null ? null : Number(r.sale_price),
    images: byProduct.get(r.id) ?? [],
    category: (r.category_id && catById.get(r.category_id)) || null,
  })) as Product[];
}

export async function fetchFeatured(): Promise<Product[]> {
  const rows = check(
    await supabase.from("public_products").select("*").eq("is_featured", true).order("created_at", { ascending: false }).limit(10),
  );
  return hydrate(rows ?? []);
}

export async function fetchNewest(limit = 10): Promise<Product[]> {
  const rows = check(await supabase.from("public_products").select("*").order("created_at", { ascending: false }).limit(limit));
  return hydrate(rows ?? []);
}

export type ShopFilters = {
  categoryId?: string | null;
  search?: string;
  size?: string | null;
  color?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  availability?: "available" | "few_left" | "sold_out" | null;
  sort?: "newest" | "price_asc" | "price_desc";
};

/** One page of the Shop grid (infinite scroll). */
export async function fetchShopPage(f: ShopFilters, page: number): Promise<Product[]> {
  let q = supabase.from("public_products").select("*");
  if (f.categoryId) q = q.eq("category_id", f.categoryId);
  if (f.search?.trim()) {
    const s = f.search.trim().replace(/[%,()]/g, " ");
    q = q.or(`name.ilike.%${s}%,description.ilike.%${s}%,material.ilike.%${s}%`);
  }
  if (f.size) q = q.contains("sizes", [f.size]);
  if (f.color) q = q.contains("colors", [f.color]);
  if (f.availability) q = q.eq("stock_status", f.availability);
  // Price filters only match products with a visible price.
  if (f.minPrice != null) q = q.gte("price", f.minPrice);
  if (f.maxPrice != null) q = q.lte("price", f.maxPrice);
  if (f.sort === "price_asc") q = q.order("price", { ascending: true, nullsFirst: false });
  else if (f.sort === "price_desc") q = q.order("price", { ascending: false, nullsFirst: false });
  q = q.order("created_at", { ascending: false });
  const from = page * PAGE_SIZE;
  const rows = check(await q.range(from, from + PAGE_SIZE - 1));
  return hydrate(rows ?? []);
}

/** All sizes and colours in the catalog, for the filter sheet. */
export async function fetchFacets(): Promise<{ sizes: string[]; colors: string[] }> {
  const rows = check(await supabase.from("public_products").select("sizes, colors")) ?? [];
  const sizes = new Set<string>();
  const colors = new Set<string>();
  for (const r of rows as { sizes: string[]; colors: string[] }[]) {
    r.sizes?.forEach((s) => sizes.add(s));
    r.colors?.forEach((c) => colors.add(c));
  }
  const order = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "Free Size"];
  return {
    sizes: [...sizes].sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99) || a.localeCompare(b)),
    colors: [...colors].sort(),
  };
}

export async function fetchProduct(slug: string): Promise<Product | null> {
  const row = check(await supabase.from("public_products").select("*").eq("slug", slug).maybeSingle());
  if (!row) return null;
  const [p] = await hydrate([row]);
  return p;
}

export async function fetchRelated(p: Product): Promise<Product[]> {
  let q = supabase.from("public_products").select("*").neq("id", p.id).order("created_at", { ascending: false }).limit(8);
  if (p.category_id) q = q.eq("category_id", p.category_id);
  let rows = check(await q) ?? [];
  if (rows.length < 4) {
    rows = check(await supabase.from("public_products").select("*").neq("id", p.id).order("view_count", { ascending: false }).limit(8)) ?? [];
  }
  return hydrate(rows);
}

export async function fetchProductsByIds(ids: string[]): Promise<Product[]> {
  if (!ids.length) return [];
  const rows = check(await supabase.from("public_products").select("*").in("id", ids)) ?? [];
  const list = await hydrate(rows);
  return ids.map((id) => list.find((p) => p.id === id)).filter((p): p is Product => Boolean(p));
}

export async function fetchDropPoints(): Promise<DropPoint[]> {
  const { data } = await supabase.from("drop_points").select("*").eq("is_active", true).order("sort_order").order("name");
  return (data ?? []) as DropPoint[];
}

/** Counts a product view without giving shoppers write access (same RPC as the website). */
export function recordView(slug: string) {
  supabase.rpc("increment_product_view", { p_slug: slug }).then(() => {});
}

export function logDmClick(productId: string | null, channel: "messenger" | "instagram" | "direct") {
  supabase
    .from("dm_clicks")
    .insert({ product_id: productId, channel })
    .then(() => {});
}
