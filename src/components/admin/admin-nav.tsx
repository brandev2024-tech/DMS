"use client";

import { ExternalLink, FolderHeart, Inbox, LayoutDashboard, LogOut, MapPin, Settings, Shirt } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "../logo";
import { createClient } from "@/lib/supabase/client";

const LINKS = [
  { href: "/admin", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", Icon: Shirt },
  { href: "/admin/categories", label: "Categories", Icon: FolderHeart },
  { href: "/admin/inbox", label: "Inbox", Icon: Inbox },
  { href: "/admin/drop-points", label: "Drop-offs", Icon: MapPin },
  { href: "/admin/settings", label: "Settings", Icon: Settings },
];

function useAdminUnread() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const supabase = createClient();
    const load = async () => {
      const { data } = await supabase.from("conversations").select("unread_admin").gt("unread_admin", 0);
      setCount((data ?? []).reduce((n, c) => n + (c.unread_admin as number), 0));
    };
    load();
    const ch = supabase
      .channel("admin-unread")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);
  return count;
}

export function AdminNav() {
  const pathname = usePathname();
  const unread = useAdminUnread();
  const active = (href: string) => (href === "/admin" ? pathname === href : pathname.startsWith(href));

  const badge = unread > 0 && (
    <span className="ml-auto rounded-full bg-rose-ink px-1.5 text-[0.65rem] font-semibold leading-5 text-on-ink">
      {unread}
      <span className="sr-only"> unread</span>
    </span>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-surface p-5 lg:flex">
        <Logo href="/admin" size="sm" tagline="Admin Panel" />
        <nav className="mt-10 flex flex-col gap-1" aria-label="Admin">
          {LINKS.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={active(href) ? "page" : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition ${active(href) ? "bg-ink text-on-ink" : "hover:bg-blush"}`}
            >
              <Icon className="size-4" /> {label}
              {href === "/admin/inbox" && badge}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-1 text-sm">
          <Link href="/" className="flex min-h-11 items-center gap-3 rounded-xl px-3 hover:bg-blush">
            <ExternalLink className="size-4" /> View shop
          </Link>
          <form action="/auth/signout" method="post">
            <button className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 hover:bg-blush">
              <LogOut className="size-4" /> Log out
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile top bar + bottom tabs */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-bg/90 px-4 backdrop-blur lg:hidden">
        <Logo href="/admin" size="sm" tagline="Admin Panel" />
        <Link href="/" className="btn-ghost min-h-10 px-3 text-xs">
          <ExternalLink className="size-4" /> Shop
        </Link>
      </header>
      <nav
        aria-label="Admin"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {LINKS.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={active(href) ? "page" : undefined}
            className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[0.6rem] ${active(href) ? "text-rose-ink" : "text-muted"}`}
          >
            <Icon className="size-5" />
            {label}
            {href === "/admin/inbox" && unread > 0 && (
              <span className="absolute right-[22%] top-1.5 size-2 rounded-full bg-rose-ink" aria-label={`${unread} unread`} />
            )}
          </Link>
        ))}
      </nav>
    </>
  );
}
