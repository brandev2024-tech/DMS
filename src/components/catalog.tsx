"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ProductCard } from "./product/product-card";
import { effectivePrice } from "@/lib/format";
import type { Category, Product, ShopSettings } from "@/lib/types";

type Sort = "newest" | "price-asc" | "price-desc";

type Props = {
  products: Product[];
  categories: Pick<Category, "id" | "name" | "slug">[];
  settings: ShopSettings;
  activeCategory?: string;
  initialQuery?: string;
};

function uniq(list: string[]) {
  const seen = new Map<string, string>();
  for (const v of list) if (!seen.has(v.toLowerCase())) seen.set(v.toLowerCase(), v);
  return [...seen.values()];
}

export function Catalog({ products, categories, settings, activeCategory, initialQuery = "" }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState<Sort>("newest");
  const [sizes, setSizes] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  const allSizes = useMemo(() => uniq(products.flatMap((p) => p.sizes)), [products]);
  const allColors = useMemo(() => uniq(products.flatMap((p) => p.colors)), [products]);

  const priceFilterOn = minPrice !== "" || maxPrice !== "";
  const activeCount = sizes.length + colors.length + (priceFilterOn ? 1 : 0) + (inStockOnly ? 1 : 0);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const min = minPrice === "" ? null : Number(minPrice);
    const max = maxPrice === "" ? null : Number(maxPrice);
    const lc = (xs: string[]) => xs.map((x) => x.toLowerCase());

    const list = products.filter((p) => {
      if (q) {
        const hay = [p.name, p.description, p.material, p.category?.name, ...p.colors].join(" ").toLowerCase();
        if (!q.split(/\s+/).every((w) => hay.includes(w))) return false;
      }
      if (sizes.length && !lc(p.sizes).some((s) => lc(sizes).includes(s))) return false;
      if (colors.length && !lc(p.colors).some((c) => lc(colors).includes(c))) return false;
      if (inStockOnly && p.stock_status === "sold_out") return false;
      if (priceFilterOn) {
        // Products with a hidden price are only excluded when a price range is set.
        const price = effectivePrice(p);
        if (price == null) return false;
        if (min != null && price < min) return false;
        if (max != null && price > max) return false;
      }
      return true;
    });

    if (sort === "newest") {
      list.sort((a, b) => b.created_at.localeCompare(a.created_at));
    } else {
      const dir = sort === "price-asc" ? 1 : -1;
      list.sort((a, b) => {
        const pa = effectivePrice(a);
        const pb = effectivePrice(b);
        // "DM for Price" items always go last when sorting by price.
        if (pa == null && pb == null) return b.created_at.localeCompare(a.created_at);
        if (pa == null) return 1;
        if (pb == null) return -1;
        return (pa - pb) * dir;
      });
    }
    return list;
  }, [products, query, sizes, colors, inStockOnly, priceFilterOn, minPrice, maxPrice, sort]);

  const toggle = (list: string[], set: (v: string[]) => void, v: string) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const clearAll = () => {
    setSizes([]);
    setColors([]);
    setMinPrice("");
    setMaxPrice("");
    setInStockOnly(false);
  };

  const filters = (
    <div className="space-y-6">
      {allSizes.length > 0 && (
        <fieldset>
          <legend className="label">Size</legend>
          <div className="flex flex-wrap gap-2">
            {allSizes.map((s) => (
              <button key={s} type="button" className="chip" aria-pressed={sizes.includes(s)} onClick={() => toggle(sizes, setSizes, s)}>
                {s}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      {allColors.length > 0 && (
        <fieldset>
          <legend className="label">Color</legend>
          <div className="flex flex-wrap gap-2">
            {allColors.map((c) => (
              <button key={c} type="button" className="chip" aria-pressed={colors.includes(c)} onClick={() => toggle(colors, setColors, c)}>
                {c}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      <fieldset>
        <legend className="label">Price range ({settings.currency_symbol})</legend>
        <div className="flex items-center gap-2">
          <input
            className="input"
            inputMode="numeric"
            type="number"
            min={0}
            placeholder="Min"
            aria-label="Minimum price"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
          />
          <span className="text-muted">–</span>
          <input
            className="input"
            inputMode="numeric"
            type="number"
            min={0}
            placeholder="Max"
            aria-label="Maximum price"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />
        </div>
        {priceFilterOn && <p className="mt-1.5 text-xs text-muted">&quot;DM for Price&quot; items are hidden while a price range is set.</p>}
      </fieldset>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
        <input type="checkbox" className="size-5 accent-[var(--rose-ink)]" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} />
        Hide sold out
      </label>
    </div>
  );

  return (
    <div>
      {/* Category chips */}
      <nav aria-label="Categories" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6">
        <Link href="/shop" className="chip shrink-0" aria-pressed={!activeCategory} aria-current={!activeCategory ? "page" : undefined}>
          All
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/shop/${c.slug}`}
            className="chip shrink-0"
            aria-pressed={activeCategory === c.slug}
            aria-current={activeCategory === c.slug ? "page" : undefined}
          >
            {c.name}
          </Link>
        ))}
      </nav>

      {/* Search + sort + filter toggle */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <label className="relative min-w-0 flex-1 basis-full sm:basis-auto">
          <span className="sr-only">Search products</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input type="search" className="input pl-10" placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <button type="button" className="btn-outline flex-1 sm:flex-none" aria-expanded={panelOpen} onClick={() => setPanelOpen((o) => !o)}>
          <SlidersHorizontal className="size-4" /> Filters{activeCount ? ` (${activeCount})` : ""}
        </button>
        <label className="flex-1 sm:flex-none">
          <span className="sr-only">Sort by</span>
          <select className="input min-w-40 rounded-full" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="newest">Newest</option>
            <option value="price-asc">Price: low → high</option>
            <option value="price-desc">Price: high → low</option>
          </select>
        </label>
      </div>

      {panelOpen && (
        <div className="card animate-fade-in mt-4 p-5">
          {filters}
          <div className="mt-6 flex justify-between gap-3 border-t border-line pt-4">
            <button type="button" className="btn-ghost" onClick={clearAll} disabled={!activeCount}>
              <X className="size-4" /> Clear
            </button>
            <button type="button" className="btn-primary" onClick={() => setPanelOpen(false)}>
              Show {results.length} {results.length === 1 ? "item" : "items"}
            </button>
          </div>
        </div>
      )}

      <p className="mt-5 text-sm text-muted" aria-live="polite">
        {results.length} {results.length === 1 ? "piece" : "pieces"}
      </p>

      {results.length ? (
        <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4">
          {results.map((p, i) => (
            <div key={p.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
              <ProductCard product={p} settings={settings} priority={i < 4} />
            </div>
          ))}
        </div>
      ) : (
        <div className="card mt-6 px-6 py-16 text-center">
          <p className="font-serif text-2xl">Nothing here yet 💭</p>
          <p className="mt-2 text-sm text-muted">Try another filter, or DM us. We might have it in stock!</p>
          {(activeCount > 0 || query) && (
            <button
              className="btn-outline mt-5"
              onClick={() => {
                clearAll();
                setQuery("");
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
