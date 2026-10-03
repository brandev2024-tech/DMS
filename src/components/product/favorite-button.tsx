"use client";

import { Heart } from "lucide-react";
import { useShop, type FavoriteSnapshot } from "../shop-context";

export function FavoriteButton({ product, className = "" }: { product: FavoriteSnapshot; className?: string }) {
  const { favoriteIds, toggleFavorite } = useShop();
  const active = favoriteIds.has(product.id);
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? `Remove ${product.name} from favorites` : `Save ${product.name} to favorites`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(product);
      }}
      className={`grid size-10 place-items-center rounded-full transition hover:scale-110 ${className}`}
    >
      <Heart
        strokeWidth={1.5}
        className={`size-[1.2rem] drop-shadow-[0_1px_2px_rgb(255_255_255_/_0.8)] transition ${active ? "fill-rose-ink text-rose-ink" : "text-ink"}`}
      />
    </button>
  );
}
