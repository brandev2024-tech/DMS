"use client";

import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ImageManager, type DraftImage } from "./image-manager";
import { TagInput, Toggle } from "./tag-input";
import { useToast } from "../toast";
import { deleteImages, uploadImage } from "@/lib/chat";
import { slugify } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import type { AdminProduct, Category, StockStatus } from "@/lib/types";

const SIZE_PRESETS = ["XS", "S", "M", "L", "XL", "Free Size"];
const COLOR_PRESETS = ["Cream", "Ivory", "Blush", "Dusty Rose", "Mocha", "Champagne", "Black", "White"];

export function ProductForm({
  product,
  categories,
  currencySymbol,
}: {
  product?: AdminProduct;
  categories: Pick<Category, "id" | "name">[];
  currencySymbol: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const isEdit = Boolean(product);

  const [f, setF] = useState({
    name: product?.name ?? "",
    slug: product?.slug ?? "",
    description: product?.description ?? "",
    category_id: product?.category_id ?? categories[0]?.id ?? "",
    price: product?.price?.toString() ?? "",
    sale_price: product?.sale_price?.toString() ?? "",
    show_price: product?.show_price ?? true,
    sizes: product?.sizes ?? [],
    colors: product?.colors ?? [],
    material: product?.material ?? "",
    stock_status: (product?.stock_status ?? "available") as StockStatus,
    stock_qty: product?.stock_qty?.toString() ?? "",
    is_featured: product?.is_featured ?? false,
    is_new: product?.is_new ?? !isEdit,
    is_best_seller: product?.is_best_seller ?? false,
    is_visible: product?.is_visible ?? true,
  });
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [images, setImages] = useState<DraftImage[]>(
    [...(product?.product_images ?? [])]
      .sort((a, b) => Number(b.is_main) - Number(a.is_main) || a.sort_order - b.sort_order)
      .map((i) => ({ key: i.id, r2Key: i.r2_key })),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((prev) => ({ ...prev, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const price = f.price.trim() === "" ? null : Number(f.price);
    const sale = f.sale_price.trim() === "" ? null : Number(f.sale_price);
    if (price != null && (Number.isNaN(price) || price < 0)) return setError("Price must be a positive number.");
    if (sale != null && (Number.isNaN(sale) || sale < 0)) return setError("Sale price must be a positive number.");
    if (sale != null && price != null && sale >= price) return setError("Sale price should be lower than the regular price.");

    setSaving(true);
    const supabase = createClient();
    const row = {
      name: f.name.trim(),
      slug: slugify(f.slug || f.name),
      description: f.description.trim() || null,
      category_id: f.category_id || null,
      price,
      sale_price: sale,
      // A blank price always means "DM for Price".
      show_price: f.show_price && price != null,
      sizes: f.sizes,
      colors: f.colors,
      material: f.material.trim() || null,
      stock_status: f.stock_status,
      stock_qty: f.stock_qty === "" ? null : Math.max(0, parseInt(f.stock_qty, 10) || 0),
      is_featured: f.is_featured,
      is_new: f.is_new,
      is_best_seller: f.is_best_seller,
      is_visible: f.is_visible,
    };

    try {
      let id = product?.id;
      if (id) {
        const { error } = await supabase.from("products").update(row).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("products").insert(row).select("id").single();
        if (error) throw error;
        id = data.id as string;
      }

      // Upload new photos, then rewrite the image list in display order.
      const keys: string[] = [];
      for (const img of images) {
        keys.push(img.file ? await uploadImage("product", img.file) : img.r2Key!);
      }
      const { error: delErr } = await supabase.from("product_images").delete().eq("product_id", id);
      if (delErr) throw delErr;
      if (keys.length) {
        const { error: insErr } = await supabase
          .from("product_images")
          .insert(keys.map((r2_key, i) => ({ product_id: id, r2_key, sort_order: i, is_main: i === 0 })));
        if (insErr) throw insErr;
      }

      // Clean up photos that were removed in this edit.
      // Duplicated products share photos, so only delete keys no other product uses.
      const removed = (product?.product_images ?? []).map((i) => i.r2_key).filter((k) => !keys.includes(k));
      if (removed.length) {
        const { data: stillUsed } = await supabase.from("product_images").select("r2_key").in("r2_key", removed);
        const used = new Set((stillUsed ?? []).map((r) => r.r2_key as string));
        deleteImages(removed.filter((k) => !used.has(k)));
      }

      toast(isEdit ? "Product saved ✨" : "Product added ✨");
      router.push("/admin/products");
      router.refresh();
    } catch (err) {
      const e = err as { code?: string; message?: string };
      setError(e.code === "23505" ? "That URL slug is already used by another product. Please change it." : e.message ?? "Couldn't save the product.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link href="/admin/products" className="grid size-10 place-items-center rounded-full hover:bg-blush" aria-label="Back to products">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="flex-1 text-3xl">{isEdit ? "Edit product" : "Add product"}</h1>
        {isEdit && product!.is_visible && (
          <Link href={`/product/${product!.slug}`} target="_blank" className="btn-ghost text-xs">
            <ExternalLink className="size-4" /> View on site
          </Link>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <section className="card space-y-4 p-5">
            <label className="block">
              <span className="label">Product name *</span>
              <input
                className="input"
                required
                value={f.name}
                placeholder="e.g. Cloud Cream Faux Fur Crop"
                onChange={(e) => {
                  set("name", e.target.value);
                  if (!slugTouched) set("slug", slugify(e.target.value));
                }}
              />
            </label>
            <label className="block">
              <span className="label">URL slug</span>
              <div className="flex items-center gap-1 text-sm">
                <span className="hidden text-muted sm:inline">/product/</span>
                <input
                  className="input"
                  value={f.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set("slug", slugify(e.target.value));
                  }}
                />
              </div>
            </label>
            <label className="block">
              <span className="label">Description</span>
              <textarea className="input resize-y" rows={5} value={f.description} onChange={(e) => set("description", e.target.value)} />
            </label>
          </section>

          <section className="card p-5">
            <h2 className="mb-3 text-lg">Photos</h2>
            <ImageManager images={images} onChange={setImages} />
          </section>

          <section className="card space-y-5 p-5">
            <h2 className="text-lg">Variants</h2>
            <TagInput label="Sizes" values={f.sizes} onChange={(v) => set("sizes", v)} suggestions={SIZE_PRESETS} placeholder="Type a size and press Enter" />
            <TagInput label="Colors" values={f.colors} onChange={(v) => set("colors", v)} suggestions={COLOR_PRESETS} placeholder="Type a color and press Enter" />
            <label className="block">
              <span className="label">Material</span>
              <input className="input" placeholder="e.g. Faux fur, satin lining" value={f.material} onChange={(e) => set("material", e.target.value)} />
            </label>
          </section>
        </div>

        <div className="space-y-6">
          <section className="card space-y-3 p-5">
            <h2 className="text-lg">Price</h2>
            <Toggle
              label="Show price on site"
              checked={f.show_price}
              onChange={(v) => set("show_price", v)}
              hint={f.show_price ? "Shoppers see the price." : "Shoppers see “DM for Price 💌”."}
            />
            <label className="block">
              <span className="label">
                Price ({currencySymbol}) {!f.show_price && <span className="font-normal text-muted">· private</span>}
              </span>
              <input className="input" type="number" min={0} step="0.01" inputMode="decimal" placeholder="Leave blank for DM for Price" value={f.price} onChange={(e) => set("price", e.target.value)} />
            </label>
            <label className="block">
              <span className="label">
                Sale price ({currencySymbol}) <span className="font-normal text-muted">optional</span>
              </span>
              <input className="input" type="number" min={0} step="0.01" inputMode="decimal" value={f.sale_price} onChange={(e) => set("sale_price", e.target.value)} />
              <span className="mt-1 block text-xs text-muted">The regular price shows crossed out.</span>
            </label>
            {!f.show_price && f.price && (
              <p className="rounded-xl bg-blush/60 p-2.5 text-xs">Your price is saved for your reference only. It is never sent to shoppers.</p>
            )}
          </section>

          <section className="card space-y-3 p-5">
            <h2 className="text-lg">Organize</h2>
            <label className="block">
              <span className="label">Category</span>
              <select className="input" value={f.category_id} onChange={(e) => set("category_id", e.target.value)}>
                <option value="">Uncategorized</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="label">Stock status</span>
                <select className="input" value={f.stock_status} onChange={(e) => set("stock_status", e.target.value as StockStatus)}>
                  <option value="available">Available</option>
                  <option value="few_left">Few Left</option>
                  <option value="sold_out">Sold Out</option>
                </select>
              </label>
              <label className="block">
                <span className="label">Quantity</span>
                <input className="input" type="number" min={0} inputMode="numeric" value={f.stock_qty} onChange={(e) => set("stock_qty", e.target.value)} />
              </label>
            </div>
          </section>

          <section className="card space-y-1 p-5">
            <h2 className="mb-2 text-lg">Badges &amp; visibility</h2>
            <Toggle label="Visible on site" checked={f.is_visible} onChange={(v) => set("is_visible", v)} hint="Hidden products are only seen by you." />
            <Toggle label="Featured" checked={f.is_featured} onChange={(v) => set("is_featured", v)} hint="Shows in the home page carousel." />
            <Toggle label="New" checked={f.is_new} onChange={(v) => set("is_new", v)} />
            <Toggle label="Best Seller" checked={f.is_best_seller} onChange={(v) => set("is_best_seller", v)} />
          </section>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded-xl bg-blush px-4 py-3 text-sm text-rose-ink">
          {error}
        </p>
      )}

      <div className="sticky bottom-16 z-20 mt-6 flex justify-end gap-2 rounded-2xl border border-line bg-bg/95 p-3 backdrop-blur lg:bottom-4">
        <Link href="/admin/products" className="btn-ghost">
          Cancel
        </Link>
        <button className="btn-primary min-w-36" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Saving…
            </>
          ) : isEdit ? (
            "Save changes"
          ) : (
            "Add product"
          )}
        </button>
      </div>
    </form>
  );
}
