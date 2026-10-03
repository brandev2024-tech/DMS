import Link from "next/link";
import { InstallAppButton } from "./install-app";
import { Logo } from "./logo";
import { SocialIconRow } from "./social-links";
import type { Category, ShopSettings } from "@/lib/types";
import { imageUrl } from "@/lib/images";

export function Footer({ settings, categories }: { settings: ShopSettings; categories: Category[] }) {
  const contact = [
    settings.phone && { label: "Phone / Viber", text: settings.phone, href: `tel:${settings.phone.replace(/\s/g, "")}` },
    settings.email && { label: "Email", text: settings.email, href: `mailto:${settings.email}` },
    settings.hours && { label: "Hours", text: settings.hours },
    settings.location && { label: "Based in", text: settings.location },
  ].filter(Boolean) as { label: string; text: string; href?: string }[];

  return (
    <footer className="mt-28 border-t border-line pb-32 pt-16 md:pb-12">
      <div className="container-page grid gap-12 md:grid-cols-12">
        <div className="space-y-6 md:col-span-5">
          <Logo name={settings.shop_name} tagline={settings.tagline} logoUrl={imageUrl(settings.logo_key, "thumb")} size="lg" />
          <p className="max-w-xs text-sm leading-relaxed text-muted">
            Cropped jackets for ladies, especially fur &amp; faux fur. See something you love? <span className="accent font-serif text-base">Just DM us.</span>
          </p>
          <SocialIconRow settings={settings} />
          <InstallAppButton />
        </div>

        <div className="md:col-span-3">
          <h2 className="label">Shop</h2>
          <ul className="space-y-2.5 text-sm">
            <li>
              <Link href="/shop" className="transition-colors hover:text-rose-ink">
                Shop all
              </Link>
            </li>
            <li>
              <Link href="/delivery" className="transition-colors hover:text-rose-ink">
                Drop-offs &amp; delivery
              </Link>
            </li>
            {categories.slice(0, 5).map((c) => (
              <li key={c.id}>
                <Link href={`/shop/${c.slug}`} className="transition-colors hover:text-rose-ink">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="md:col-span-4">
          <h2 className="label">Contact</h2>
          <dl className="space-y-3 text-sm">
            {contact.map(({ label, text, href }) => (
              <div key={label}>
                <dt className="text-[0.68rem] uppercase tracking-[0.14em] text-muted">{label}</dt>
                <dd>
                  {href ? (
                    <a href={href} className="transition-colors hover:text-rose-ink">
                      {text}
                    </a>
                  ) : (
                    text
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <div className="container-page mt-14 flex flex-col gap-2 border-t border-line pt-6 text-[0.7rem] uppercase tracking-[0.14em] text-muted sm:flex-row sm:justify-between">
        <p>
          © {new Date().getFullYear()} {settings.shop_name} · {settings.tagline}
        </p>
        <p>
          Made with <span className="text-rose-ink">♥</span> for cozy girls
        </p>
      </div>
    </footer>
  );
}
