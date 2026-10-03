import { ChevronRight, MapPin, Package, Ruler, Sparkles, Truck, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { Badges } from "@/components/product/badges";
import { Gallery } from "@/components/product/gallery";
import { Price } from "@/components/product/price";
import { PhotoDmButtons, ProductActionsProvider, ProductShare, VariantPicker } from "@/components/product/product-actions";
import { ProductCard } from "@/components/product/product-card";
import { getProductBySlug, getProducts, getSettings } from "@/lib/data";
import { absoluteUrl, effectivePrice, mainImage, priceLabel, sortImages, STOCK_LABEL } from "@/lib/format";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { imageUrl } from "@/lib/images";

export async function generateMetadata({ params }: PageProps<"/product/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const [product, settings] = await Promise.all([getProductBySlug(slug), getSettings()]);
  if (!product) return { title: "Product not found" };

  const img = mainImage(product.images);
  const price = priceLabel(product, settings);
  const description =
    `${price ?? "DM for Price 💌"} · ${product.description ?? `${product.name} at ${settings.shop_name}`}`.slice(0, 200);
  const image = img ? { url: absoluteUrl(imageUrl(img.r2_key)!), alt: product.name } : undefined;

  // These tags power the link preview (with product photo) inside Messenger.
  return {
    title: product.name,
    description,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      type: "website",
      title: `${product.name} | ${settings.shop_name}`,
      description,
      url: `/product/${product.slug}`,
      images: image ? [image] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} | ${settings.shop_name}`,
      description,
      images: image ? [image.url] : undefined,
    },
  };
}

export default async function ProductPage({ params }: PageProps<"/product/[slug]">) {
  const { slug } = await params;
  const [product, settings] = await Promise.all([getProductBySlug(slug), getSettings()]);
  if (!product) notFound();

  // Request APIs aren't allowed inside after() in pages, so create the client first.
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    after(async () => {
      await supabase.rpc("increment_product_view", { p_slug: slug });
    });
  }

  const images = sortImages(product.images);
  const img = images[0];
  const related = product.category_id
    ? await getProducts({ categoryId: product.category_id, excludeId: product.id, limit: 4 })
    : [];
  const price = effectivePrice(product);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    image: images.map((i) => absoluteUrl(imageUrl(i.r2_key)!)),
    material: product.material ?? undefined,
    color: product.colors.join(", ") || undefined,
    brand: { "@type": "Brand", name: settings.shop_name },
    ...(price != null && {
      offers: {
        "@type": "Offer",
        price,
        priceCurrency: settings.currency_code,
        availability: product.stock_status === "sold_out" ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
        url: absoluteUrl(`/product/${product.slug}`),
      },
    }),
  };

  return (
    <div className="container-page pb-8 pt-4 md:pt-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1 overflow-hidden text-xs text-muted">
        <Link href="/shop" className="shrink-0 hover:text-rose-ink">
          Shop
        </Link>
        {product.category && (
          <>
            <ChevronRight className="size-3 shrink-0" />
            <Link href={`/shop/${product.category.slug}`} className="shrink-0 hover:text-rose-ink">
              {product.category.name}
            </Link>
          </>
        )}
        <ChevronRight className="size-3 shrink-0" />
        <span className="truncate" aria-current="page">
          {product.name}
        </span>
      </nav>

      <ProductActionsProvider
        product={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          url: absoluteUrl(`/product/${product.slug}`),
          image: img ? absoluteUrl(imageUrl(img.r2_key)!) : null,
          thumb: imageUrl(img?.r2_key, "thumb"),
          price: priceLabel(product, settings),
          sizes: product.sizes,
          colors: product.colors,
          soldOut: product.stock_status === "sold_out",
        }}
      >
        <div className="grid gap-8 md:grid-cols-12 md:gap-14">
          {/* Photo with the DM buttons right underneath it */}
          <div className="md:col-span-7">
            <div className="md:sticky md:top-24">
              <Gallery images={images} name={product.name}>
                <PhotoDmButtons />
              </Gallery>
            </div>
          </div>

          <div className="animate-fade-up md:col-span-5 md:pt-4">
            <Badges product={product} />
            <h1 className="mt-4 text-4xl font-light leading-[1.05] sm:text-5xl">{product.name}</h1>
            <div className="mt-4">
              <Price product={product} settings={settings} size="lg" />
            </div>

            <dl className="mt-6 flex flex-wrap gap-x-6 gap-y-2 border-y border-line py-4 text-[0.8rem] text-muted">
              {product.category && (
                <div className="flex items-center gap-1.5">
                  <dt className="sr-only">Category</dt>
                  <Sparkles className="size-4 text-rose-ink" strokeWidth={1.5} />
                  <dd>{product.category.name}</dd>
                </div>
              )}
              {product.material && (
                <div className="flex items-center gap-1.5">
                  <dt className="sr-only">Material</dt>
                  <Ruler className="size-4 text-rose-ink" strokeWidth={1.5} />
                  <dd>{product.material}</dd>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <dt className="sr-only">Stock</dt>
                <Package className="size-4 text-rose-ink" strokeWidth={1.5} />
                <dd className={product.stock_status === "sold_out" ? "text-rose-ink" : ""}>{STOCK_LABEL[product.stock_status]}</dd>
              </div>
            </dl>

            {product.description && <p className="mt-6 whitespace-pre-line text-[0.95rem] leading-relaxed text-muted">{product.description}</p>}

            <VariantPicker />

            <div className="mt-8 divide-y divide-line border-y border-line text-sm">
              <Link href="/delivery" className="group flex items-center gap-3 py-4">
                <MapPin className="size-5 shrink-0 text-rose-ink" strokeWidth={1.5} />
                <span className="flex-1">
                  <span className="block font-medium">Pick up in Baguio &amp; La Trinidad</span>
                  <span className="block text-muted">Drop-off points &amp; partner shops near you</span>
                </span>
                <ChevronRight className="size-4 text-muted transition group-hover:translate-x-0.5" strokeWidth={1.5} />
              </Link>
              {settings.couriers.length > 0 && (
                <div className="flex items-center gap-3 py-4">
                  <Truck className="size-5 shrink-0 text-rose-ink" strokeWidth={1.5} />
                  <span>
                    <span className="block font-medium">Nationwide shipping</span>
                    <span className="block text-muted">via {settings.couriers.join(" or ")}</span>
                  </span>
                </div>
              )}
              {settings.payment_notes && (
                <div className="flex items-center gap-3 py-4">
                  <Wallet className="size-5 shrink-0 text-rose-ink" strokeWidth={1.5} />
                  <span>
                    <span className="block font-medium">Payment</span>
                    <span className="block text-muted">{settings.payment_notes}</span>
                  </span>
                </div>
              )}
            </div>
            <ProductShare className="btn-ghost mt-4 -ml-4" />
          </div>
        </div>

      </ProductActionsProvider>

      {related.length > 0 && (
        <section className="mt-24 border-t border-line pt-16" aria-labelledby="related-heading">
          <p className="eyebrow">Complete the look</p>
          <h2 id="related-heading" className="mt-2 text-4xl">
            You may also <em>like</em>
          </h2>
          <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} settings={settings} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
