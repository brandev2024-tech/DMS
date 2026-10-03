import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { ShopProvider } from "@/components/shop-context";
import { getCategories, getCurrentUser, getSettings } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase/config";

// Always render per request: pages depend on the visitor session and live shop data.
export const dynamic = "force-dynamic";

export default async function ShopLayout({ children }: LayoutProps<"/">) {
  const [settings, categories, current] = await Promise.all([getSettings(), getCategories(), getCurrentUser()]);

  const user = current
    ? {
        id: current.id,
        email: current.email,
        name: current.profile?.full_name ?? null,
        isAdmin: current.profile?.role === "admin",
      }
    : null;

  return (
    <ShopProvider user={user} settings={settings}>
      {!isSupabaseConfigured && (
        <div className="bg-ink px-4 py-2 text-center text-[0.68rem] uppercase tracking-[0.16em] text-on-ink">
          Demo mode · sample products shown · connect Supabase to go live (see README)
        </div>
      )}
      <Header categories={categories.map((c) => ({ name: c.name, slug: c.slug }))} />
      <main className="flex-1">{children}</main>
      <Footer settings={settings} categories={categories} />
    </ShopProvider>
  );
}
