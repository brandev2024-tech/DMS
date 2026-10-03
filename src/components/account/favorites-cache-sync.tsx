"use client";

import { useEffect } from "react";
import { writeFavoriteCache, type FavoriteSnapshot } from "../shop-context";

/** Mirrors the server's favorites list into localStorage for the offline page. */
export function FavoritesCacheSync({ favorites }: { favorites: FavoriteSnapshot[] }) {
  useEffect(() => {
    writeFavoriteCache(favorites);
  }, [favorites]);
  return null;
}
