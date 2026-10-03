"use client";

import { Heart, LayoutDashboard, Menu, MessageCircle, Search, User, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { InstallBanner } from "./install-app";
import { Logo } from "./logo";
import { useShop } from "./shop-context";
import { UnreadDot, useShopperUnread } from "./unread-badge";
import type { Category } from "@/lib/types";
import { imageUrl } from "@/lib/images";

export function Header({ categories }: { categories: Pick<Category, "name" | "slug">[] }) {
  const { user, settings } = useShop();
  const unread = useShopperUnread();
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState("");
  const pathname = usePathname();
  const router = useRouter();

  // Close menus on navigation.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset UI when the route changes
    setOpen(false);
    setSearching(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  const iconBtn = "relative grid size-10 place-items-center rounded-full transition-colors hover:text-rose-ink";
  const navLink = (href: string, label: string) => (
    <Link
      key={href}
      href={href}
      aria-current={pathname === href ? "page" : undefined}
      className="text-[0.72rem] font-medium uppercase tracking-[0.18em] transition-colors hover:text-rose-ink aria-[current=page]:text-rose-ink"
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur-md">
      <InstallBanner />
      <div className="container-page grid h-16 grid-cols-[1fr_auto_1fr] items-center md:h-20">
        {/* Left: menu (mobile) / nav (desktop) */}
        <div className="flex items-center">
          <button className={`${iconBtn} -ml-2 md:hidden`} aria-label="Open menu" onClick={() => setOpen(true)}>
            <Menu className="size-5" strokeWidth={1.5} />
          </button>
          <nav className="hidden items-center gap-7 md:flex" aria-label="Main">
            {navLink("/shop", "Shop")}
            {categories[0] && navLink(`/shop/${categories[0].slug}`, "Fur Crops")}
            {navLink("/delivery", "Drop-offs")}
          </nav>
        </div>

        <Logo name={settings.shop_name} tagline={settings.tagline} logoUrl={imageUrl(settings.logo_key, "thumb")} size="sm" align="center" />

        <div className="flex items-center justify-end">
          <button className={iconBtn} aria-label="Search" aria-expanded={searching} onClick={() => setSearching((s) => !s)}>
            <Search className="size-[1.15rem]" strokeWidth={1.5} />
          </button>
          <Link href={user ? "/account#favorites" : "/login?next=/account"} className={`${iconBtn} hidden sm:grid`} aria-label="Favorites">
            <Heart className="size-[1.15rem]" strokeWidth={1.5} />
          </Link>
          {user?.isAdmin ? (
            <Link href="/admin" className={iconBtn} aria-label="Admin dashboard">
              <LayoutDashboard className="size-[1.15rem]" strokeWidth={1.5} />
            </Link>
          ) : (
            <Link href={user ? "/messages" : "/login?next=/messages"} className={iconBtn} aria-label="My messages">
              <MessageCircle className="size-[1.15rem]" strokeWidth={1.5} />
              <UnreadDot count={unread} />
            </Link>
          )}
          <Link href={user ? "/account" : "/login"} className={`${iconBtn} -mr-2`} aria-label={user ? "My account" : "Log in"}>
            <User className="size-[1.15rem]" strokeWidth={1.5} />
          </Link>
        </div>
      </div>

      {searching && (
        <form
          role="search"
          className="animate-fade-in border-t border-line"
          onSubmit={(e) => {
            e.preventDefault();
            router.push(`/shop?q=${encodeURIComponent(q.trim())}`);
          }}
        >
          <label className="container-page relative flex items-center gap-3 py-3">
            <span className="sr-only">Search products</span>
            <Search className="size-4 shrink-0 text-muted" strokeWidth={1.5} />
            <input
              autoFocus
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search fur crops, tops, bags…"
              className="w-full bg-transparent py-1 font-serif text-2xl outline-none placeholder:text-muted/60"
            />
          </label>
        </form>
      )}

      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="animate-fade-in absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div className="animate-fade-up absolute inset-y-0 left-0 flex w-[86%] max-w-sm flex-col overflow-y-auto bg-bg px-6 py-5">
            <div className="flex items-center justify-between">
              <Logo name={settings.shop_name} tagline={settings.tagline} size="sm" />
              <button className={`${iconBtn} -mr-2`} aria-label="Close menu" onClick={() => setOpen(false)}>
                <X className="size-5" strokeWidth={1.5} />
              </button>
            </div>
            <nav className="mt-10 flex flex-col" aria-label="Mobile">
              {[
                ["/", "Home"],
                ["/shop", "Shop all"],
                ["/#how-to-order", "How to order"],
                ["/delivery", "Drop-offs & delivery"],
                [user ? "/messages" : "/login?next=/messages", "My messages"],
                [user ? "/account" : "/login", user ? "My account" : "Log in"],
                ...(user?.isAdmin ? [["/admin", "Admin panel"]] : []),
              ].map(([href, label]) => (
                <Link key={href} href={href} className="border-b border-line py-3.5 font-serif text-[1.7rem] leading-tight">
                  {label}
                </Link>
              ))}
            </nav>
            {categories.length > 0 && (
              <>
                <p className="eyebrow mt-10">Categories</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {categories.map((c) => (
                    <Link key={c.slug} href={`/shop/${c.slug}`} className="chip">
                      {c.name}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
