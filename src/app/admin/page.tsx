import { Eye, Inbox, MessageCircleHeart, Plus, Shirt } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { InstagramIcon, MessengerIcon } from "@/components/brand-icons";
import { PushToggle } from "@/components/account/push-toggle";
import { requireAdmin } from "@/lib/admin";
import { mainImage, timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { AdminProduct, Category, Conversation } from "@/lib/types";
import { imageUrl } from "@/lib/images";

function daysAgoIso(days: number) {
  return new Date(Date.now() - days * 864e5).toISOString();
}

export default async function AdminDashboard() {
  const user = await requireAdmin();
  const supabase = await createClient();
  const weekAgo = daysAgoIso(7);

  const clickCount = (channel: string, since?: string) => {
    let q = supabase.from("dm_clicks").select("id", { count: "exact", head: true }).eq("channel", channel);
    if (since) q = q.gte("created_at", since);
    return q;
  };

  const [products, categories, convos, topViewed, messenger, instagram, direct, messengerWk, instagramWk, directWk] = await Promise.all([
    supabase.from("products").select("id, category_id, is_visible"),
    supabase.from("categories").select("id, name").order("sort_order"),
    supabase.from("conversations").select("*, shopper:profiles(full_name)").order("last_message_at", { ascending: false }).limit(50),
    supabase.from("products").select("id, name, slug, view_count, product_images(*)").order("view_count", { ascending: false }).limit(5),
    clickCount("messenger"),
    clickCount("instagram"),
    clickCount("direct"),
    clickCount("messenger", weekAgo),
    clickCount("instagram", weekAgo),
    clickCount("direct", weekAgo),
  ]);

  const productRows = (products.data ?? []) as Pick<AdminProduct, "id" | "category_id" | "is_visible">[];
  const cats = (categories.data ?? []) as Pick<Category, "id" | "name">[];
  const conversations = (convos.data ?? []) as Conversation[];
  const unread = conversations.reduce((n, c) => n + c.unread_admin, 0);
  const newInquiries = conversations.filter((c) => c.unread_admin > 0).length;
  const openCount = conversations.filter((c) => c.status === "open").length;

  const perCategory = cats
    .map((c) => ({ ...c, count: productRows.filter((p) => p.category_id === c.id).length }))
    .filter((c) => c.count > 0);
  const maxPer = Math.max(1, ...perCategory.map((c) => c.count));

  const stats = [
    { label: "Products", value: productRows.length, sub: `${productRows.filter((p) => p.is_visible).length} visible`, Icon: Shirt, href: "/admin/products" },
    { label: "New inquiries", value: newInquiries, sub: `${unread} unread messages`, Icon: MessageCircleHeart, href: "/admin/inbox" },
    { label: "Open chats", value: openCount, sub: "Direct Ask", Icon: Inbox, href: "/admin/inbox" },
  ];

  const clicks = [
    { label: "Messenger", total: messenger.count ?? 0, week: messengerWk.count ?? 0, Icon: MessengerIcon },
    { label: "Instagram", total: instagram.count ?? 0, week: instagramWk.count ?? 0, Icon: InstagramIcon },
    {
      label: "Direct Ask",
      total: direct.count ?? 0,
      week: directWk.count ?? 0,
      Icon: ({ className }: { className?: string }) => <MessageCircleHeart className={`${className} text-rose-ink`} />,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1 className="mt-1 text-3xl sm:text-4xl">Hello{user.profile?.full_name ? `, ${user.profile.full_name.split(" ")[0]}` : ""} ✨</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <PushToggle userId={user.id} className="btn-outline" />
          <Link href="/admin/products/new" className="btn-primary">
            <Plus className="size-4" /> Add product
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {stats.map(({ label, value, sub, Icon, href }) => (
          <Link key={label} href={href} className="card flex items-center gap-4 p-5 transition hover:border-rose">
            <span className="grid size-12 place-items-center rounded-2xl bg-blush">
              <Icon className="size-5 text-rose-ink" />
            </span>
            <span>
              <span className="block text-3xl font-semibold leading-none">{value}</span>
              <span className="mt-1 block text-sm">{label}</span>
              <span className="block text-xs text-muted">{sub}</span>
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-5" aria-labelledby="clicks-h">
          <h2 id="clicks-h" className="text-xl">
            DM button clicks
          </h2>
          <ul className="mt-4 space-y-3">
            {clicks.map(({ label, total, week, Icon }) => (
              <li key={label} className="flex items-center gap-3">
                <Icon className="size-8 shrink-0" />
                <span className="flex-1 text-sm">{label}</span>
                <span className="text-right">
                  <span className="block text-lg font-semibold leading-none">{total}</span>
                  <span className="text-xs text-muted">{week} this week</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-5" aria-labelledby="percat-h">
          <h2 id="percat-h" className="text-xl">
            Products per category
          </h2>
          {perCategory.length ? (
            <ul className="mt-4 space-y-2.5">
              {perCategory.map((c) => (
                <li key={c.id} className="text-sm">
                  <div className="flex justify-between">
                    <span>{c.name}</span>
                    <span className="font-medium">{c.count}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-blush">
                    <div className="h-full rounded-full bg-rose" style={{ width: `${(c.count / maxPer) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted">No products yet.</p>
          )}
        </section>

        <section className="card p-5" aria-labelledby="viewed-h">
          <h2 id="viewed-h" className="text-xl">
            Most viewed
          </h2>
          <ol className="mt-4 space-y-3">
            {((topViewed.data ?? []) as (Pick<AdminProduct, "id" | "name" | "slug" | "view_count" | "product_images">)[]).map((p, i) => {
              const img = mainImage(p.product_images);
              return (
                <li key={p.id} className="flex items-center gap-3">
                  <span className="w-4 text-sm text-muted">{i + 1}</span>
                  <span className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-blush">
                    {img && <Image src={imageUrl(img.r2_key, "thumb")!} alt="" fill sizes="44px" className="object-cover" />}
                  </span>
                  <Link href={`/admin/products/${p.id}`} className="min-w-0 flex-1 truncate text-sm hover:text-rose-ink">
                    {p.name}
                  </Link>
                  <span className="flex items-center gap-1 text-sm text-muted">
                    <Eye className="size-4" /> {p.view_count}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="card p-5" aria-labelledby="recent-h">
          <div className="flex items-center justify-between">
            <h2 id="recent-h" className="text-xl">
              Recent inquiries
            </h2>
            <Link href="/admin/inbox" className="text-sm text-rose-ink hover:underline">
              Open inbox
            </Link>
          </div>
          {conversations.length ? (
            <ul className="mt-3 divide-y divide-line">
              {conversations.slice(0, 6).map((c) => (
                <li key={c.id}>
                  <Link href={`/admin/inbox?c=${c.id}`} className="flex items-center gap-3 py-3 hover:text-rose-ink">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-blush font-serif text-rose-ink">
                      {(c.shopper?.full_name || "S").charAt(0)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-sm ${c.unread_admin ? "font-semibold" : ""}`}>{c.shopper?.full_name || "Shopper"}</span>
                      <span className="block truncate text-xs text-muted">{c.last_message}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted">{timeAgo(c.last_message_at)}</span>
                    {c.unread_admin > 0 && <span className="size-2 rounded-full bg-rose-ink" aria-label="unread" />}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted">No Direct Ask chats yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}
