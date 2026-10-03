import { Heart, LayoutDashboard, LogOut, MessageCircleHeart } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FavoritesCacheSync } from "@/components/account/favorites-cache-sync";
import { ProfileForm } from "@/components/account/profile-form";
import { PushToggle } from "@/components/account/push-toggle";
import { ProductCard } from "@/components/product/product-card";
import { getCurrentUser, getProducts, getSettings } from "@/lib/data";
import { mainImage, priceLabel } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { imageUrl } from "@/lib/images";

export const metadata: Metadata = { title: "My Account", robots: { index: false } };

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");

  const supabase = await createClient();
  const [{ data: favRows }, settings] = await Promise.all([
    supabase.from("favorites").select("product_id, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
    getSettings(),
  ]);
  const order = (favRows ?? []).map((f) => f.product_id as string);
  const favorites = (await getProducts({ ids: order })).sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));

  const name = user.profile?.full_name?.split(" ")[0];

  return (
    <div className="container-page pt-8">
      <p className="eyebrow">My Account</p>
      <h1 className="mt-1 text-4xl">Hi{name ? `, ${name}` : ""} 💕</h1>
      <p className="mt-1 text-sm text-muted">{user.email}</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {user.profile?.role === "admin" ? (
          <Link href="/admin" className="btn-primary">
            <LayoutDashboard className="size-4" /> Admin Panel
          </Link>
        ) : (
          <Link href="/messages" className="btn-primary">
            <MessageCircleHeart className="size-4" /> My Messages
          </Link>
        )}
        <PushToggle userId={user.id} />
        <form action="/auth/signout" method="post">
          <button className="btn-ghost">
            <LogOut className="size-4" /> Log out
          </button>
        </form>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[22rem_1fr]">
        <section className="card h-fit p-6" aria-labelledby="profile-heading">
          <h2 id="profile-heading" className="mb-5 text-2xl">
            Profile
          </h2>
          <ProfileForm profile={{ id: user.id, full_name: user.profile?.full_name ?? null, phone: user.profile?.phone ?? null, address: user.profile?.address ?? null }} />
        </section>

        <section id="favorites" className="scroll-mt-24" aria-labelledby="fav-heading">
          <h2 id="fav-heading" className="flex items-center gap-2 text-2xl">
            <Heart className="size-5 fill-rose-ink text-rose-ink" /> Favorites
          </h2>
          <FavoritesCacheSync
            favorites={favorites.map((p) => ({
              id: p.id,
              slug: p.slug,
              name: p.name,
              image: imageUrl(mainImage(p.images)?.r2_key, "thumb"),
              price: priceLabel(p, settings),
            }))}
          />
          {favorites.length ? (
            <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-5">
              {favorites.map((p) => (
                <ProductCard key={p.id} product={p} settings={settings} sizes="(min-width: 640px) 25vw, 50vw" />
              ))}
            </div>
          ) : (
            <div className="card mt-5 px-6 py-12 text-center">
              <p className="font-serif text-xl">No favorites yet</p>
              <p className="mt-1 text-sm text-muted">Tap the ♡ on any piece to save it here.</p>
              <Link href="/shop" className="btn-outline mt-5">
                Browse the collection
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
