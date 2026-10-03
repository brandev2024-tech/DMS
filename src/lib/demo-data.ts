import { DEFAULT_SETTINGS } from "./defaults";
import type { Category, DropPoint, Product, ShopSettings } from "./types";

/**
 * Sample shop shown when Supabase isn't connected yet ("demo mode"), so the
 * storefront is browsable straight after `npm run dev`. Mirrors supabase/seed.sql.
 */

export const DEMO_SETTINGS: ShopSettings = {
  ...DEFAULT_SETTINGS,
  hero_subtext: "Fur & faux-fur cropped jackets for soft-luxe days. Tap any piece and slide into our DMs.",
  facebook_url: "https://www.facebook.com/DMSPHIL",
  facebook_enabled: true,
  messenger_username: "DMSPHIL",
  messenger_enabled: true,
  instagram_username: "dmsphil",
  instagram_enabled: true,
  tiktok_url: null,
  tiktok_enabled: false,
  phone: "0917 000 0000",
  email: "hello@dms.shop",
  hours: "Mon–Sat, 10AM–8PM",
  location: "Metro Manila, Philippines",
  how_to_order:
    "Browse and tap a piece you love, then message us on Messenger, Instagram or Direct Ask. We'll confirm size, price and delivery with you.",
  payment_notes: "GCash, Maya, bank transfer, or COD (selected areas).",
  shipping_notes: "Free pick-up at our drop-off points in Baguio, La Trinidad & nearby towns. Nationwide shipping via J&T Express or LBC, sent within 1–3 days of payment.",
};

const CATS: [string, string, string][] = [
  ["Cropped Fur Jackets", "cropped-fur-jackets", "Our signature: plush fur & faux-fur cropped jackets."],
  ["Cropped Jackets", "cropped-jackets", "Denim, leather, tweed and more, all cropped to flatter."],
  ["Tops", "tops", "Knits, blouses and layering tops."],
  ["Dresses", "dresses", "Day-to-night dresses."],
  ["Bottoms", "bottoms", "Skirts, trousers and jeans."],
  ["Accessories", "accessories", "Scarves, hair clips and the little extras."],
  ["Bags", "bags", "Fluffy totes, minis and shoulder bags."],
  ["Others", "others", "Everything else we love."],
];
const COVERS: Record<string, string> = {
  "cropped-fur-jackets": "cat-fur",
  "cropped-jackets": "cat-jackets",
  tops: "cat-tops",
  dresses: "cat-dresses",
  bottoms: "cat-bottoms",
  accessories: "cat-accessories",
  bags: "cat-bags",
  others: "cat-others",
};

export const DEMO_CATEGORIES: Category[] = CATS.map(([name, slug, description], i) => ({
  id: `demo-cat-${slug}`,
  name,
  slug,
  description,
  cover_image_key: `demo/${COVERS[slug]}.webp`,
  sort_order: i,
  is_visible: true,
}));

type Row = [
  cat: string,
  name: string,
  slug: string,
  description: string,
  price: number | null,
  sale: number | null,
  sizes: string[],
  colors: string[],
  material: string,
  stock: Product["stock_status"],
  featured: boolean,
  isNew: boolean,
  best: boolean,
  images: number,
  ageDays: number,
  views: number,
];

const ROWS: Row[] = [
  ["cropped-fur-jackets", "Cloud Cream Faux Fur Crop", "cloud-cream-faux-fur-crop", "Our bestselling cloud-soft faux fur jacket, cropped at the waist with a cozy shawl collar. Fully lined, hook closure, and endlessly huggable.", 1250, null, ["XS", "S", "M", "L"], ["Cream", "Ivory"], "Faux fur, satin lining", "available", true, true, true, 3, 1, 284],
  ["cropped-fur-jackets", "Blush Teddy Cropped Jacket", "blush-teddy-cropped-jacket", "A sweet blush-pink teddy jacket with a boxy cropped fit and oversized pockets. Pairs with everything from denim to slip dresses.", 1390, 1150, ["S", "M", "L"], ["Blush", "Dusty Rose"], "Teddy faux fur", "few_left", true, true, false, 3, 2, 231],
  ["cropped-fur-jackets", "Mocha Shearling Crop", "mocha-shearling-crop", "Rich mocha suede-feel shell with plush faux shearling trim. A cropped moto silhouette for cool-weather layering.", null, null, ["S", "M", "L", "XL"], ["Mocha", "Camel"], "Faux suede, faux shearling", "available", true, false, true, 3, 5, 198],
  ["cropped-fur-jackets", "Champagne Fluffy Bolero", "champagne-fluffy-bolero", "An ultra-cropped fluffy bolero in shimmering champagne. Made for parties, weddings and every twirl in between.", 990, null, ["Free Size"], ["Champagne", "White"], "Faux fox fur", "available", true, true, false, 2, 3, 176],
  ["cropped-fur-jackets", "Dusty Rose Shaggy Crop", "dusty-rose-shaggy-crop", "Long-pile shaggy faux fur in a muted dusty rose. Soft, statement-making and photo-ready.", null, null, ["XS", "S", "M"], ["Dusty Rose"], "Shaggy faux fur", "few_left", false, true, false, 2, 4, 142],
  ["cropped-fur-jackets", "Noir Luxe Faux Mink Crop", "noir-luxe-faux-mink-crop", "Sleek black faux mink with a high collar and cropped hem. Instant evening glam.", 1650, null, ["S", "M", "L"], ["Black"], "Faux mink", "sold_out", false, false, false, 2, 20, 120],
  ["cropped-jackets", "Ivory Tweed Cropped Jacket", "ivory-tweed-cropped-jacket", "Classic boucle tweed with gold-tone buttons and fringe edges. Quiet luxury, cropped.", 1450, null, ["S", "M", "L"], ["Ivory", "Pink"], "Boucle tweed", "available", false, false, true, 2, 12, 163],
  ["cropped-jackets", "Washed Denim Crop Jacket", "washed-denim-crop-jacket", "Light-wash denim cropped jacket with a relaxed fit. Your everyday layer.", 850, null, ["S", "M", "L", "XL"], ["Light Wash", "Mid Wash"], "Cotton denim", "available", false, false, false, 2, 15, 88],
  ["tops", "Angora Knit Cardigan Top", "angora-knit-cardigan-top", "Fuzzy angora-blend knit with pearl buttons. Wear it open or buttoned as a top.", 690, null, ["Free Size"], ["Cream", "Blush", "Lilac"], "Angora blend knit", "available", false, true, false, 2, 6, 97],
  ["dresses", "Satin Slip Midi Dress", "satin-slip-midi-dress", "Bias-cut satin slip dress that layers perfectly under a cropped fur jacket.", null, null, ["XS", "S", "M", "L"], ["Champagne", "Mocha"], "Satin", "available", false, false, false, 2, 9, 104],
  ["bags", "Fluffy Mini Shoulder Bag", "fluffy-mini-shoulder-bag", "A cloud-soft faux fur mini bag with a gold chain strap. The perfect match for your crop.", 590, 490, [], ["Cream", "Blush", "Black"], "Faux fur, gold-tone hardware", "available", true, false, true, 2, 7, 155],
  ["accessories", "Faux Fur Hair Clip Set", "faux-fur-hair-clip-set", "Set of 3 fluffy claw clips in our signature colors.", 250, null, [], ["Mixed"], "Faux fur, acrylic", "available", false, true, false, 1, 3, 61],
];

/** Front, close-up, three-quarter, styled — see scripts/generate-demo-photos.mjs */
const DEMO_PHOTOS_PER_PRODUCT = 4;
const DAY = 864e5;
const now = Date.now();

export const DEMO_PRODUCTS: Product[] = ROWS.map(
  ([cat, name, slug, description, price, sale, sizes, colors, material, stock, featured, isNew, best, , age, views]) => {
    const category = DEMO_CATEGORIES.find((c) => c.slug === cat)!;
    const id = `demo-${slug}`;
    return {
      id,
      category_id: category.id,
      name,
      slug,
      description,
      price,
      sale_price: sale,
      show_price: price != null,
      sizes,
      colors,
      material,
      stock_status: stock,
      is_featured: featured,
      is_new: isNew,
      is_best_seller: best,
      view_count: views,
      created_at: new Date(now - age * DAY).toISOString(),
      images: Array.from({ length: DEMO_PHOTOS_PER_PRODUCT }, (_, i) => ({
        id: `${id}-img-${i + 1}`,
        product_id: id,
        r2_key: `demo/${slug}-${i + 1}.webp`,
        sort_order: i,
        is_main: i === 0,
      })),
      category: { id: category.id, name: category.name, slug: category.slug },
    };
  },
).sort((a, b) => b.created_at.localeCompare(a.created_at));

const POINTS: [string, DropPoint["kind"], string, string, string, string, string | null, number, number][] = [
  ["Session Road Drop Point", "drop_point", "Baguio City", "Session Road", "Upper Session Road, near the Post Office end", "Mon–Sat, 10AM–6PM", "Message us first so we can prepare your item.", 16.4114, 120.5985],
  ["Burnham Park Meet-up", "drop_point", "Baguio City", "Burnham Park", "By the lake, Harrison Road side", "Sat–Sun, 2PM–5PM", "Scheduled meet-ups only.", 16.4122, 120.594],
  ["Legarda Road Partner Shop", "partner", "Baguio City", "Legarda Road", "Near the Legarda–Session junction", "Mon–Sat, 9AM–7PM", "Pick-up & drop-off. Bring your order name.", 16.4087, 120.5928],
  ["Luneta Hill Drop Point", "drop_point", "Baguio City", "Luneta Hill", "Upper Session / Luneta Hill area", "Daily, 11AM–7PM", null, 16.4097, 120.6003],
  ["Mines View Partner", "partner", "Baguio City", "Mines View", "Mines View Park area", "Daily, 8AM–5PM", "Great for tourists picking up before heading home.", 16.4197, 120.6286],
  ["La Trinidad Town Center", "drop_point", "La Trinidad", "Km. 5, La Trinidad", "Near the Municipal Hall", "Mon–Fri, 9AM–5PM", null, 16.4554, 120.5878],
  ["BSU Gate Drop Point", "drop_point", "La Trinidad", "Benguet State University", "Main gate, Km. 6", "Mon–Fri, 12NN–5PM", "Student-friendly pick-up.", 16.446, 120.5905],
  ["Strawberry Farm Partner", "partner", "La Trinidad", "Strawberry Farm area", "Betag, La Trinidad", "Daily, 8AM–5PM", null, 16.4632, 120.5888],
  ["Tuba (Marcos Highway) Partner", "partner", "Tuba", "Marcos Highway", "Along Marcos Highway", "Mon–Sat, 9AM–5PM", null, 16.388, 120.564],
  ["Itogon (Tuding) Drop Point", "drop_point", "Itogon", "Tuding", "Tuding, near the Baguio boundary", "Sat, 10AM–4PM", null, 16.4138, 120.644],
  ["Sablan Partner", "partner", "Sablan", "Poblacion", "Sablan Poblacion", "By appointment", "Message us to schedule.", 16.496, 120.487],
  ["Tublay Drop Point", "drop_point", "Tublay", "Poblacion", "Tublay Poblacion", "By appointment", "Message us to schedule.", 16.513, 120.629],
];

export const DEMO_DROP_POINTS: DropPoint[] = POINTS.map(([name, kind, area, address, landmark, schedule, notes, lat, lng], i) => ({
  id: `demo-point-${i + 1}`,
  name,
  kind,
  area,
  address,
  landmark,
  schedule,
  notes,
  lat,
  lng,
  sort_order: i,
  is_active: true,
}));
