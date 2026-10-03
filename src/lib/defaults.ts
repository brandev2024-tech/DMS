import type { ShopSettings } from "./types";

/** Used when the settings row is missing (e.g. before the migration has run). */
export const DEFAULT_SETTINGS: ShopSettings = {
  shop_name: "DMS",
  tagline: "Direct Message Us",
  logo_key: null,
  hero_image_key: null,
  hero_headline: "Cropped. Cozy. Couture.",
  hero_subtext:
    "Fur & faux-fur cropped jackets, made for soft-luxe days. Tap any piece and slide into our DMs 💌",
  facebook_url: null,
  facebook_enabled: false,
  messenger_username: null,
  messenger_enabled: false,
  instagram_username: null,
  instagram_enabled: false,
  tiktok_url: null,
  tiktok_enabled: false,
  other_links: [],
  phone: null,
  email: null,
  hours: null,
  location: null,
  how_to_order: null,
  payment_notes: null,
  shipping_notes: null,
  currency_code: "PHP",
  currency_symbol: "₱",
  quick_replies: [],
  couriers: ["J&T Express", "LBC"],
};
