"use client";

import { RotateCw } from "lucide-react";
import { useEffect, useState } from "react";
import { readFavoriteCache, type FavoriteSnapshot } from "@/components/shop-context";

export function OfflineFavorites() {
  const [favs, setFavs] = useState<FavoriteSnapshot[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is browser-only
    setFavs(readFavoriteCache());
  }, []);

  return (
    <div className="mt-8 w-full max-w-2xl">
      {favs.length ? (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {favs.map((f) => (
            <li key={f.id}>
              <a href={`/product/${f.slug}`} className="block text-left">
                <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-blush shadow-soft">
                  {/* Plain <img> so the service worker's cached copy can be used offline. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {f.image && <img src={f.image} alt={f.name} className="size-full object-cover" />}
                </div>
                <p className="mt-2 font-serif leading-snug">{f.name}</p>
                <p className="text-sm text-muted">{f.price ?? "DM for Price 💌"}</p>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Save favorites with the ♡ while online and they&apos;ll show up here.</p>
      )}
      <button className="btn-primary mt-10" onClick={() => location.reload()}>
        <RotateCw className="size-4" /> Try again
      </button>
    </div>
  );
}
