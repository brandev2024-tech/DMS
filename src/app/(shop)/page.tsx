import { ArrowRight, ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ProductCard } from "@/components/product/product-card";
import { DropPointsSection } from "@/components/drop-points/drop-points-section";
import { getSocialLinks } from "@/components/social-links";
import { getCategories, getDropPoints, getProducts, getSettings } from "@/lib/data";
import { mainImage } from "@/lib/format";
import { imageUrl } from "@/lib/images";

/** "Cropped. Cozy. Couture." → the last word becomes the italic rose accent. */
function Headline({ text }: { text: string }) {
  const words = text.trim().split(/\s+/);
  const last = words.pop();
  return (
    <>
      {words.join(" ")} {last && <em>{last}</em>}
    </>
  );
}

function SectionHead({ eyebrow, title, href, linkLabel }: { eyebrow: string; title: React.ReactNode; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4 sm:mb-10">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="mt-2 text-4xl sm:text-5xl">{title}</h2>
      </div>
      {href && (
        <Link href={href} className="link-underline shrink-0 text-[0.72rem] font-medium uppercase tracking-[0.16em]">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

export default async function HomePage() {
  const [settings, categories, featured, all, dropPoints] = await Promise.all([
    getSettings(),
    getCategories(),
    getProducts({ featured: true, limit: 10 }),
    getProducts({ limit: 12 }),
    getDropPoints(),
  ]);

  const arrivals = featured.length ? featured : all.slice(0, 8);
  const heroProduct = arrivals[0];
  const heroImage = imageUrl(settings.hero_image_key ?? mainImage(heroProduct?.images)?.r2_key ?? "demo/hero.webp")!;
  const socials = getSocialLinks(settings);

  const steps = [
    { title: "Browse & tap", text: "Find a piece you love and open it for photos, sizes and details." },
    { title: "Send a DM", text: "Tap Messenger, Instagram or Direct Ask. Your message is pre-written with size & color." },
    { title: "We confirm", text: "We reply with price, availability and delivery. Then it's on its way to you." },
  ];

  return (
    <>
      {/* Hero — editorial split */}
      <section className="container-page pt-6 md:pt-10">
        <div className="grid items-center gap-8 md:grid-cols-12 md:gap-10">
          <div className="animate-fade-up order-2 md:order-1 md:col-span-5">
            <p className="eyebrow">New season · Fur &amp; faux fur</p>
            <h1 className="mt-5 text-[3.4rem] font-light leading-[0.95] sm:text-7xl lg:text-[6.2rem]">
              <Headline text={settings.hero_headline} />
            </h1>
            {settings.hero_subtext && <p className="mt-6 max-w-sm text-[0.95rem] leading-relaxed text-muted">{settings.hero_subtext}</p>}
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
              <Link href="/shop" className="btn-primary px-8">
                Shop the collection
              </Link>
              <Link href="#how-to-order" className="link-underline text-[0.72rem] font-medium uppercase tracking-[0.16em]">
                How to order
              </Link>
            </div>
          </div>

          <div className="animate-fade-up order-1 md:order-2 md:col-span-7">
            <Link
              href={heroProduct ? `/product/${heroProduct.slug}` : "/shop"}
              className="group relative block aspect-[4/5] overflow-hidden rounded-2xl bg-blush md:aspect-[5/6]"
            >
              <Image
                src={heroImage}
                alt={heroProduct ? `${heroProduct.name}, featured cropped jacket` : "Featured cropped fur jacket"}
                fill
                priority
                sizes="(min-width: 768px) 58vw, 100vw"
                className="object-cover transition duration-1000 group-hover:scale-[1.02]"
              />
              {heroProduct && (
                <span className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-full bg-surface/90 px-5 py-3 text-sm backdrop-blur sm:left-auto sm:min-w-72">
                  <span className="truncate">{heroProduct.name}</span>
                  <ArrowUpRight className="ml-3 size-4 shrink-0 text-rose-ink" strokeWidth={1.5} />
                </span>
              )}
            </Link>
          </div>
        </div>
      </section>

      {/* Category strip */}
      {categories.length > 0 && (
        <nav aria-label="Categories" className="mt-14 border-y border-line">
          <div className="container-page no-scrollbar flex gap-8 overflow-x-auto py-4">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/shop/${c.slug}`}
                className="shrink-0 font-serif text-xl italic text-muted transition-colors hover:text-rose-ink"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </nav>
      )}

      {/* New arrivals carousel */}
      {arrivals.length > 0 && (
        <section className="container-page mt-20" aria-labelledby="arrivals-heading">
          <SectionHead
            eyebrow={featured.length ? "Featured" : "Just in"}
            title={
              <span id="arrivals-heading">
                New <em>arrivals</em>
              </span>
            }
            href="/shop"
            linkLabel="View all"
          />
          <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:scroll-px-6 sm:gap-6 sm:px-6 lg:mx-0 lg:scroll-px-0 lg:px-0">
            {arrivals.map((p, i) => (
              <div key={p.id} className="w-[64%] shrink-0 snap-start sm:w-[38%] lg:w-[24%]">
                <ProductCard product={p} settings={settings} priority={i < 2} sizes="(min-width: 1024px) 24vw, (min-width: 640px) 38vw, 64vw" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* The full collection — every piece, right on the home page */}
      {all.length > 0 && (
        <section className="container-page mt-24" aria-labelledby="collection-heading">
          <SectionHead
            eyebrow="Shop the edit"
            title={
              <span id="collection-heading">
                The <em>collection</em>
              </span>
            }
            href="/shop"
            linkLabel="Shop all"
          />
          <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4">
            {all.map((p) => (
              <ProductCard key={p.id} product={p} settings={settings} />
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link href="/shop" className="btn-outline px-10">
              Browse everything <ArrowRight className="size-4" strokeWidth={1.5} />
            </Link>
          </div>
        </section>
      )}

      {/* Shop by category */}
      {categories.length > 0 && (
        <section className="container-page mt-24" aria-labelledby="cat-heading">
          <SectionHead
            eyebrow="Find your vibe"
            title={
              <span id="cat-heading">
                Shop by <em>category</em>
              </span>
            }
          />
          <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-6 md:grid-cols-4">
            {categories.slice(0, 8).map((c) => (
              <Link key={c.id} href={`/shop/${c.slug}`} className="group block">
                <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-blush">
                  {c.cover_image_key && (
                    <Image src={imageUrl(c.cover_image_key, "thumb")!} alt="" fill sizes="(min-width: 768px) 25vw, 50vw" className="object-cover transition duration-700 group-hover:scale-[1.03]" />
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <h3 className="font-serif text-xl font-normal">{c.name}</h3>
                  <ArrowRight className="size-4 -translate-x-1 text-rose-ink opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" strokeWidth={1.5} />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* How to order */}
      <section id="how-to-order" className="mt-24 scroll-mt-24 bg-blush/60 py-20" aria-labelledby="how-heading">
        <div className="container-page">
          <div className="max-w-xl">
            <p className="eyebrow">No checkout, just chat</p>
            <h2 id="how-heading" className="mt-2 text-4xl sm:text-5xl">
              How to <em>order</em>
            </h2>
            {settings.how_to_order && <p className="mt-4 text-[0.95rem] leading-relaxed text-muted">{settings.how_to_order}</p>}
          </div>
          <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
            {steps.map(({ title, text }, i) => (
              <li key={title} className="border-t border-ink/15 pt-6">
                <span className="font-serif text-5xl font-light italic text-rose-ink">0{i + 1}</span>
                <h3 className="mt-4 text-[0.78rem] font-medium uppercase tracking-[0.16em]">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
              </li>
            ))}
          </ol>
          {(settings.payment_notes || settings.shipping_notes) && (
            <dl className="mt-14 grid gap-6 border-t border-ink/15 pt-8 text-sm sm:grid-cols-2">
              {settings.payment_notes && (
                <div>
                  <dt className="label">Payment</dt>
                  <dd className="leading-relaxed">{settings.payment_notes}</dd>
                </div>
              )}
              {settings.shipping_notes && (
                <div>
                  <dt className="label">Shipping</dt>
                  <dd className="leading-relaxed">{settings.shipping_notes}</dd>
                </div>
              )}
            </dl>
          )}
        </div>
      </section>

      {/* Drop-off points map + couriers */}
      {(dropPoints.length > 0 || settings.couriers.length > 0) && (
        <section id="drop-offs" className="container-page mt-24 scroll-mt-24" aria-labelledby="drop-heading">
          <SectionHead
            eyebrow="Baguio · La Trinidad · Benguet"
            title={
              <span id="drop-heading">
                Pick up <em>near you</em>
              </span>
            }
            href="/delivery"
            linkLabel="All drop-offs"
          />
          <DropPointsSection points={dropPoints} couriers={settings.couriers} shippingNotes={settings.shipping_notes} variant="compact" />
        </section>
      )}

      {/* Social */}
      {socials.length > 0 && (
        <section className="container-page mt-24" aria-labelledby="social-heading">
          <div className="grid gap-10 md:grid-cols-12">
            <div className="md:col-span-5">
              <p className="eyebrow">Come say hi</p>
              <h2 id="social-heading" className="mt-2 text-4xl sm:text-5xl">
                Follow &amp; <em>message</em> us
              </h2>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">New drops, restocks and try-ons. We&apos;re always one message away.</p>
            </div>
            <ul className="border-t border-line md:col-span-7">
              {socials.map(({ key, label, handle, url, Icon }) => (
                <li key={key} className="border-b border-line">
                  <a href={url} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-4 py-5">
                    <Icon className="size-7 shrink-0" />
                    <span className="w-28 shrink-0 text-[0.72rem] font-medium uppercase tracking-[0.16em]">{label}</span>
                    <span className="min-w-0 flex-1 truncate font-serif text-xl italic text-muted transition-colors group-hover:text-rose-ink">{handle}</span>
                    <ArrowUpRight className="size-4 shrink-0 text-muted transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-rose-ink" strokeWidth={1.5} />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}
