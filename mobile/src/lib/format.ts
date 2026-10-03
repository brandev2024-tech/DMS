import type { Product, ProductImage, ShopSettings, StockStatus } from "./types";

type Money = Pick<ShopSettings, "currency_code" | "currency_symbol">;

export function formatMoney(amount: number, money: Money) {
  const digits = Number.isInteger(amount) ? 0 : 2;
  const n = amount.toLocaleString("en-PH", { minimumFractionDigits: digits, maximumFractionDigits: 2 });
  return `${money.currency_symbol}${n}`;
}

/** The price shoppers actually pay, or null when the price is hidden ("DM for Price"). */
export function effectivePrice(p: Pick<Product, "price" | "sale_price" | "show_price">) {
  if (!p.show_price || p.price == null) return null;
  if (p.sale_price != null && p.sale_price < p.price) return p.sale_price;
  return p.price;
}

export function priceLabel(p: Pick<Product, "price" | "sale_price" | "show_price">, money: Money) {
  const price = effectivePrice(p);
  return price == null ? null : formatMoney(price, money);
}

export function mainImage(images: ProductImage[] | undefined | null) {
  if (!images?.length) return null;
  return images.find((i) => i.is_main) ?? [...images].sort((a, b) => a.sort_order - b.sort_order)[0];
}

export function sortImages(images: ProductImage[] | undefined | null) {
  if (!images?.length) return [];
  return [...images].sort((a, b) => Number(b.is_main) - Number(a.is_main) || a.sort_order - b.sort_order);
}

export const STOCK_LABEL: Record<StockStatus, string> = {
  available: "Available",
  few_left: "Few Left",
  sold_out: "Sold Out",
};

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

export function clockTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
}

export function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" });
}
