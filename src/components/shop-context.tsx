"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useToast } from "./toast";
import { createClient } from "@/lib/supabase/client";
import type { ShopSettings } from "@/lib/types";

export type SessionUser = { id: string; name: string | null; email: string | null; isAdmin: boolean };

/** What we remember locally about a favorite, so the offline page can show it. */
export type FavoriteSnapshot = { id: string; slug: string; name: string; image: string | null; price: string | null };

const FAV_CACHE = "dms:favorites";

type ShopContextValue = {
  user: SessionUser | null;
  settings: ShopSettings;
  favoriteIds: Set<string>;
  toggleFavorite: (p: FavoriteSnapshot) => Promise<void>;
};

const ShopContext = createContext<ShopContextValue | null>(null);

export function useShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error("useShop must be used inside <ShopProvider>");
  return ctx;
}

export function readFavoriteCache(): FavoriteSnapshot[] {
  try {
    return JSON.parse(localStorage.getItem(FAV_CACHE) ?? "[]");
  } catch {
    return [];
  }
}

export function writeFavoriteCache(list: FavoriteSnapshot[]) {
  try {
    localStorage.setItem(FAV_CACHE, JSON.stringify(list));
  } catch {}
  // Ask the service worker to keep these photos for the offline page.
  const urls = list.map((f) => f.image).filter(Boolean);
  if (urls.length) navigator.serviceWorker?.controller?.postMessage({ type: "CACHE_URLS", urls });
}

export function ShopProvider({
  user,
  settings,
  children,
}: {
  user: SessionUser | null;
  settings: ShopSettings;
  children: React.ReactNode;
}) {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const toast = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    createClient()
      .from("favorites")
      .select("product_id")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (!cancelled && data) setFavoriteIds(new Set(data.map((r) => r.product_id as string)));
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const toggleFavorite = useCallback(
    async (p: FavoriteSnapshot) => {
      if (!user) {
        toast("Log in to save favorites 💕", "info");
        router.push(`/login?next=${encodeURIComponent(location.pathname)}`);
        return;
      }
      const supabase = createClient();
      const isFav = favoriteIds.has(p.id);
      const next = new Set(favoriteIds);
      if (isFav) next.delete(p.id);
      else next.add(p.id);
      setFavoriteIds(next);

      const { error } = isFav
        ? await supabase.from("favorites").delete().eq("user_id", user.id).eq("product_id", p.id)
        : await supabase.from("favorites").insert({ user_id: user.id, product_id: p.id });

      if (error) {
        setFavoriteIds(favoriteIds);
        toast("Couldn't update favorites. Please try again.", "error");
        return;
      }
      const cache = readFavoriteCache().filter((f) => f.id !== p.id);
      writeFavoriteCache(isFav ? cache : [p, ...cache]);
      toast(isFav ? "Removed from favorites" : "Saved to favorites 💕");
    },
    [user, favoriteIds, toast, router],
  );

  return (
    <ShopContext.Provider value={{ user, settings, favoriteIds, toggleFavorite }}>{children}</ShopContext.Provider>
  );
}
