import Image from "next/image";
import Link from "next/link";
import { Badges } from "./badges";
import { FavoriteButton } from "./favorite-button";
import { Price } from "./price";
import { priceLabel, sortImages } from "@/lib/format";
import type { Product, ShopSettings } from "@/lib/types";
import { imageUrl } from "@/lib/images";

type Props = {
  product: Product;
  settings: ShopSettings;
  priority?: boolean;
  sizes?: string;
};

/** Minimal card: photo (second photo fades in on hover), name, price. Tapping opens the product gallery. */
export function ProductCard({ product, settings, priority, sizes = "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw" }: Props) {
  const [img, alt] = sortImages(product.images);
  const soldOut = product.stock_status === "sold_out";
  return (
    <article className="group relative">
      <Link href={`/product/${product.slug}`} className="block focus-visible:outline-none">
        <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-blush">
          {img ? (
            <>
              <Image
                src={imageUrl(img.r2_key, "thumb")!}
                alt={`${product.name}${product.colors[0] ? ` in ${product.colors[0]}` : ""}`}
                fill
                sizes={sizes}
                priority={priority}
                className={`object-cover transition duration-700 ease-out group-hover:scale-[1.03] ${soldOut ? "opacity-60" : ""}`}
              />
              {alt && (
                <Image
                  src={imageUrl(alt.r2_key, "thumb")!}
                  alt=""
                  fill
                  sizes={sizes}
                  className="object-cover opacity-0 transition duration-700 ease-out group-hover:scale-[1.03] group-hover:opacity-100"
                />
              )}
            </>
          ) : (
            <div className="grid h-full place-items-center font-serif text-3xl tracking-[0.3em] text-rose-ink/50">DMS</div>
          )}
          <Badges product={product} className="absolute left-3 top-3 max-w-[70%]" />
        </div>
        <div className="mt-3 flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <div className="min-w-0">
            <h3 className="line-clamp-1 text-[0.9rem] font-normal transition-colors group-hover:text-rose-ink group-focus-visible:underline">
              {product.name}
            </h3>
            {product.category && (
              <p className="mt-0.5 hidden truncate text-[0.68rem] uppercase tracking-[0.14em] text-muted sm:block">{product.category.name}</p>
            )}
          </div>
          <div className="shrink-0 sm:text-right">
            <Price product={product} settings={settings} />
          </div>
        </div>
      </Link>
      <FavoriteButton
        className="absolute right-1.5 top-1.5"
        product={{ id: product.id, slug: product.slug, name: product.name, image: imageUrl(img?.r2_key, "thumb"), price: priceLabel(product, settings) }}
      />
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div>
      <div className="skeleton aspect-[4/5] rounded-xl" />
      <div className="skeleton mt-3 h-4 w-3/4 rounded" />
      <div className="skeleton mt-2 h-3 w-1/3 rounded" />
    </div>
  );
}
