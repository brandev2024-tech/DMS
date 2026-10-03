import { formatMoney } from "@/lib/format";
import type { Product, ShopSettings } from "@/lib/types";

type Props = {
  product: Pick<Product, "price" | "sale_price" | "show_price">;
  settings: Pick<ShopSettings, "currency_code" | "currency_symbol">;
  size?: "sm" | "lg";
};

export function Price({ product, settings, size = "sm" }: Props) {
  if (!product.show_price || product.price == null) {
    // The one flourish: hidden prices read as an italic serif invitation.
    return <span className={`font-serif italic text-rose-ink ${size === "lg" ? "text-[1.7rem]" : "text-[1.05rem]"}`}>DM for price</span>;
  }
  const onSale = product.sale_price != null && product.sale_price < product.price;
  const main = onSale ? product.sale_price! : product.price;
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2">
      <span className={size === "lg" ? "text-xl tracking-wide" : "text-sm tracking-wide"}>{formatMoney(main, settings)}</span>
      {onSale && (
        <s className={`text-muted ${size === "lg" ? "text-base" : "text-xs"}`}>
          <span className="sr-only">Was </span>
          {formatMoney(product.price, settings)}
        </s>
      )}
    </span>
  );
}
