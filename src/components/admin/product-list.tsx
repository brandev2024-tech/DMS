"use client";

import { Copy, Eye, EyeOff, Pencil, Plus, Search, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "../toast";
import { formatMoney, mainImage, STOCK_LABEL } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import type { AdminProduct, Category, ShopSettings } from "@/lib/types";
import { imageUrl } from "@/lib/images";

type Money = Pick<ShopSettings, "currency_code" | "currency_symbol">;

export function ProductList({ categories, money }: { categories: Pick<Category, "id" | "name">[]; money: Money }) {
  const toast = useToast();
  const [products, setProducts] = useState<AdminProduct[] | null>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<AdminProduct | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await createClient()
      .from("products")
      .select("*, product_images(*)")
      .order("created_at", { ascending: false });
    if (error) toast("Couldn't load products.", "error");
    setProducts((data ?? []) as AdminProduct[]);
  }, [toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load
    load();
  }, [load]);

  const catName = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (products ?? []).filter(
      (p) => (!cat || p.category_id === cat) && (!term || `${p.name} ${p.material ?? ""} ${p.colors.join(" ")}`.toLowerCase().includes(term)),
    );
  }, [products, q, cat]);

  const allChecked = filtered.length > 0 && filtered.every((p) => selected.has(p.id));

  async function bulkUpdate(patch: Partial<AdminProduct>, label: string) {
    const ids = [...selected];
    const { error } = await createClient().from("products").update(patch).in("id", ids);
    if (error) return toast("Bulk update failed.", "error");
    toast(`${label} for ${ids.length} product${ids.length > 1 ? "s" : ""}`);
    setSelected(new Set());
    load();
  }

  async function toggleVisible(p: AdminProduct) {
    const { error } = await createClient().from("products").update({ is_visible: !p.is_visible }).eq("id", p.id);
    if (error) return toast("Couldn't update.", "error");
    setProducts((list) => list?.map((x) => (x.id === p.id ? { ...x, is_visible: !p.is_visible } : x)) ?? null);
  }

  async function duplicate(p: AdminProduct) {
    const supabase = createClient();
    const slug = `${p.slug}-copy-${Math.random().toString(36).slice(2, 6)}`;
    const copy = {
      category_id: p.category_id,
      description: p.description,
      price: p.price,
      sale_price: p.sale_price,
      show_price: p.show_price,
      sizes: p.sizes,
      colors: p.colors,
      material: p.material,
      stock_status: p.stock_status,
      stock_qty: p.stock_qty,
      is_featured: p.is_featured,
      is_new: p.is_new,
      is_best_seller: p.is_best_seller,
    };
    const { data, error } = await supabase
      .from("products")
      .insert({ ...copy, name: `${p.name} (Copy)`, slug, is_visible: false })
      .select("id")
      .single();
    if (error) return toast("Couldn't duplicate.", "error");
    if (p.product_images.length) {
      await supabase
        .from("product_images")
        .insert(p.product_images.map((i) => ({ product_id: data.id, r2_key: i.r2_key, sort_order: i.sort_order, is_main: i.is_main })));
    }
    toast("Duplicated (hidden until you publish it)");
    load();
  }

  async function remove(p: AdminProduct) {
    const { error } = await createClient().from("products").delete().eq("id", p.id);
    setConfirmDelete(null);
    if (error) return toast("Couldn't delete.", "error");
    toast("Product deleted");
    setProducts((list) => list?.filter((x) => x.id !== p.id) ?? null);
  }

  const priceText = (p: AdminProduct) => {
    if (p.price == null) return <span className="italic text-muted">No price</span>;
    const amount = formatMoney(p.sale_price ?? p.price, money);
    return (
      <span className={p.show_price ? "" : "text-muted"}>
        {amount}
        {!p.show_price && <span className="ml-1 text-[0.65rem] uppercase">(hidden)</span>}
      </span>
    );
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <label className="relative min-w-0 flex-1 basis-full sm:basis-auto">
          <span className="sr-only">Search products</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input className="input pl-10" type="search" placeholder="Search products…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <label className="flex-1 sm:flex-none">
          <span className="sr-only">Filter by category</span>
          <select className="input sm:w-52" value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <Link href="/admin/products/new" className="btn-primary flex-1 sm:flex-none">
          <Plus className="size-4" /> Add product
        </Link>
      </div>

      {selected.size > 0 && (
        <div className="card animate-fade-in sticky top-16 z-20 mt-4 flex flex-wrap items-center gap-2 p-3 text-sm lg:top-4">
          <span className="mr-auto font-medium">{selected.size} selected</span>
          <button className="btn-outline min-h-9 px-3 text-xs" onClick={() => bulkUpdate({ show_price: true }, "Price shown")}>
            Show price
          </button>
          <button className="btn-outline min-h-9 px-3 text-xs" onClick={() => bulkUpdate({ show_price: false }, "Price hidden (DM for Price)")}>
            Hide price
          </button>
          <button className="btn-outline min-h-9 px-3 text-xs" onClick={() => bulkUpdate({ is_visible: true }, "Made visible")}>
            Show on site
          </button>
          <button className="btn-outline min-h-9 px-3 text-xs" onClick={() => bulkUpdate({ is_visible: false }, "Hidden from site")}>
            Hide from site
          </button>
          <button className="btn-ghost min-h-9 px-3 text-xs" onClick={() => setSelected(new Set())}>
            Clear
          </button>
        </div>
      )}

      <div className="card mt-4 overflow-hidden">
        <div className="flex items-center gap-3 border-b border-line px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted">
          <input
            type="checkbox"
            aria-label="Select all"
            className="size-4 accent-[var(--rose-ink)]"
            checked={allChecked}
            onChange={() => setSelected(allChecked ? new Set() : new Set(filtered.map((p) => p.id)))}
          />
          <span className="flex-1">Product</span>
          <span className="hidden w-32 md:block">Price</span>
          <span className="hidden w-24 md:block">Stock</span>
          <span className="w-36 text-right">Actions</span>
        </div>

        {products === null ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="skeleton h-14 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-muted">No products found.</p>
        ) : (
          <ul className="divide-y divide-line">
            {filtered.map((p) => {
              const img = mainImage(p.product_images);
              return (
                <li key={p.id} className={`flex items-center gap-3 px-4 py-3 ${p.is_visible ? "" : "bg-blush/30"}`}>
                  <input
                    type="checkbox"
                    aria-label={`Select ${p.name}`}
                    className="size-4 shrink-0 accent-[var(--rose-ink)]"
                    checked={selected.has(p.id)}
                    onChange={() => {
                      const next = new Set(selected);
                      if (next.has(p.id)) next.delete(p.id);
                      else next.add(p.id);
                      setSelected(next);
                    }}
                  />
                  <Link href={`/admin/products/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-blush">
                      {img && <Image src={imageUrl(img.r2_key, "thumb")!} alt="" fill sizes="48px" className="object-cover" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium hover:text-rose-ink">{p.name}</span>
                      <span className="block truncate text-xs text-muted">
                        {catName.get(p.category_id ?? "") ?? "Uncategorized"}
                        {!p.is_visible && " · Hidden"}
                        {p.is_featured && " · ★ Featured"}
                      </span>
                      <span className="block text-xs md:hidden">{priceText(p)}</span>
                    </span>
                  </Link>
                  <span className="hidden w-32 text-sm md:block">{priceText(p)}</span>
                  <span className="hidden w-24 text-xs md:block">
                    {STOCK_LABEL[p.stock_status]}
                    {p.stock_qty != null && <span className="text-muted"> · {p.stock_qty}</span>}
                  </span>
                  <span className="flex w-36 shrink-0 justify-end">
                    <button className="grid size-9 place-items-center rounded-full hover:bg-blush" aria-label={p.is_visible ? `Hide ${p.name}` : `Show ${p.name}`} title={p.is_visible ? "Hide" : "Show"} onClick={() => toggleVisible(p)}>
                      {p.is_visible ? <Eye className="size-4" /> : <EyeOff className="size-4 text-muted" />}
                    </button>
                    <Link href={`/admin/products/${p.id}`} className="grid size-9 place-items-center rounded-full hover:bg-blush" aria-label={`Edit ${p.name}`} title="Edit">
                      <Pencil className="size-4" />
                    </Link>
                    <button className="grid size-9 place-items-center rounded-full hover:bg-blush" aria-label={`Duplicate ${p.name}`} title="Duplicate" onClick={() => duplicate(p)}>
                      <Copy className="size-4" />
                    </button>
                    <button className="grid size-9 place-items-center rounded-full text-rose-ink hover:bg-blush" aria-label={`Delete ${p.name}`} title="Delete" onClick={() => setConfirmDelete(p)}>
                      <Trash2 className="size-4" />
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title={`Delete "${confirmDelete.name}"?`}
          body="This removes the product and its photos from the shop. This can't be undone."
          confirmLabel="Delete product"
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => remove(confirmDelete)}
        />
      )}
    </div>
  );
}

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/45 p-4" onClick={onCancel}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" className="card animate-fade-up w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <h2 id="confirm-title" className="text-xl">
          {title}
        </h2>
        <p className="mt-2 text-sm text-muted">{body}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button className="btn-ghost" onClick={onCancel} autoFocus>
            Cancel
          </button>
          <button className="btn bg-rose-ink text-on-ink hover:opacity-90" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
