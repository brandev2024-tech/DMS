import type { Metadata } from "next";
import { OfflineFavorites } from "./offline-favorites";

export const metadata: Metadata = { title: "You're offline", robots: { index: false } };

/** Precached by the service worker and shown when a page can't load offline. */
export default function OfflinePage() {
  return (
    <main className="fur-bg flex min-h-dvh flex-col items-center px-4 py-16 text-center">
      <p className="font-serif text-3xl tracking-[0.12em]">DMS</p>
      <p className="text-[0.6rem] uppercase tracking-[0.32em] text-gold-ink">Direct Message Us</p>
      <h1 className="mt-10 text-4xl">You&apos;re offline 💕</h1>
      <p className="mt-2 text-muted">Your favorites are still here.</p>
      <OfflineFavorites />
    </main>
  );
}
