import type { Product } from "@/lib/types";

export function productBadges(p: Pick<Product, "stock_status" | "is_new" | "is_best_seller">) {
  const list: { label: string; style: string }[] = [];
  if (p.stock_status === "sold_out") list.push({ label: "Sold out", style: "bg-ink text-on-ink" });
  else if (p.stock_status === "few_left") list.push({ label: "Few left", style: "bg-surface text-rose-ink" });
  if (p.is_new) list.push({ label: "New", style: "bg-surface text-ink" });
  if (p.is_best_seller) list.push({ label: "Best seller", style: "bg-surface text-ink" });
  return list;
}

/** Tiny uppercase labels, minimal and quiet. */
export function Badges({ product, className = "" }: { product: Pick<Product, "stock_status" | "is_new" | "is_best_seller">; className?: string }) {
  const list = productBadges(product);
  if (!list.length) return null;
  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {list.map((b) => (
        <span key={b.label} className={`rounded-full px-2.5 py-1 text-[0.6rem] font-medium uppercase leading-none tracking-[0.14em] ${b.style}`}>
          {b.label}
        </span>
      ))}
    </div>
  );
}
