export type StockStatus = "available" | "few_left" | "sold_out";
export type DmChannel = "messenger" | "instagram" | "direct";
export type ConversationStatus = "open" | "resolved" | "archived";

export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  role: "admin" | "shopper";
  avatar_url: string | null;
  created_at: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  cover_image_key: string | null;
  description: string | null;
  sort_order: number;
  is_visible: boolean;
};

export type ProductImage = {
  id: string;
  product_id: string;
  r2_key: string;
  sort_order: number;
  is_main: boolean;
};

/** A product as shoppers see it (from the public_products view). */
export type Product = {
  id: string;
  category_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  price: number | null;
  sale_price: number | null;
  show_price: boolean;
  sizes: string[];
  colors: string[];
  material: string | null;
  stock_status: StockStatus;
  is_featured: boolean;
  is_new: boolean;
  is_best_seller: boolean;
  view_count: number;
  created_at: string;
  images: ProductImage[];
  category?: Pick<Category, "id" | "name" | "slug"> | null;
};

/** The full admin row from the products table. */
export type AdminProduct = Omit<Product, "images" | "category"> & {
  stock_qty: number | null;
  is_visible: boolean;
  updated_at: string;
  product_images: ProductImage[];
};

export type OtherLink = { label: string; url: string; enabled: boolean };

export type ShopSettings = {
  shop_name: string;
  tagline: string;
  logo_key: string | null;
  hero_image_key: string | null;
  hero_headline: string;
  hero_subtext: string | null;
  facebook_url: string | null;
  facebook_enabled: boolean;
  messenger_username: string | null;
  messenger_enabled: boolean;
  instagram_username: string | null;
  instagram_enabled: boolean;
  tiktok_url: string | null;
  tiktok_enabled: boolean;
  other_links: OtherLink[];
  phone: string | null;
  email: string | null;
  hours: string | null;
  location: string | null;
  how_to_order: string | null;
  payment_notes: string | null;
  shipping_notes: string | null;
  currency_code: string;
  currency_symbol: string;
  quick_replies: string[];
  couriers: string[];
};

export type DropPoint = {
  id: string;
  name: string;
  kind: "drop_point" | "partner";
  area: string;
  address: string | null;
  landmark: string | null;
  schedule: string | null;
  notes: string | null;
  lat: number;
  lng: number;
  sort_order: number;
  is_active: boolean;
};

export type ProductSnapshot = {
  name: string;
  slug: string;
  image: string | null;
  price: string | null;
  size?: string | null;
  color?: string | null;
};

export type Conversation = {
  id: string;
  shopper_id: string;
  status: ConversationStatus;
  last_message_at: string;
  last_message: string | null;
  unread_admin: number;
  unread_shopper: number;
  created_at: string;
  shopper?: Pick<Profile, "full_name" | "phone" | "address"> | null;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  image_key: string | null;
  product_id: string | null;
  product_snapshot: ProductSnapshot | null;
  created_at: string;
  read_at: string | null;
};
