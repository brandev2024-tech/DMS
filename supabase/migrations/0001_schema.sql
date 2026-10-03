-- =============================================================================
-- DMS (Direct Message Us) — schema, RLS policies, triggers
-- Run this whole file once in the Supabase SQL editor (or `supabase db push`).
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Profiles
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  phone       text,
  address     text,
  role        text not null default 'shopper' check (role in ('admin', 'shopper')),
  avatar_url  text,
  created_at  timestamptz not null default now()
);

-- Security-definer helper so policies can check the role without recursing
-- through the profiles RLS policies.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- Create a profile row for every new auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Shoppers may edit their own profile but never their role. Changes made from
-- the SQL editor (no auth.uid()) or by an admin are allowed.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Only admins can change roles';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- -----------------------------------------------------------------------------
-- Catalog
-- -----------------------------------------------------------------------------
create table if not exists public.categories (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  slug         text not null unique,
  cover_image_key text,                    -- R2 object key
  description  text,
  sort_order   int not null default 0,
  is_visible   boolean not null default true,
  created_at   timestamptz not null default now()
);

create table if not exists public.products (
  id              uuid primary key default gen_random_uuid(),
  category_id     uuid references public.categories (id) on delete set null,
  name            text not null,
  slug            text not null unique,
  description     text,
  price           numeric(12, 2),
  sale_price      numeric(12, 2),
  show_price      boolean not null default true,
  sizes           text[] not null default '{}',
  colors          text[] not null default '{}',
  material        text,
  stock_status    text not null default 'available'
                  check (stock_status in ('available', 'few_left', 'sold_out')),
  stock_qty       int,
  is_featured     boolean not null default false,
  is_new          boolean not null default false,
  is_best_seller  boolean not null default false,
  is_visible      boolean not null default true,
  view_count      int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists products_category_idx on public.products (category_id);
create index if not exists products_created_idx on public.products (created_at desc);

create table if not exists public.product_images (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products (id) on delete cascade,
  r2_key      text not null,               -- R2 object key ("demo/…" = bundled sample photo)
  sort_order  int not null default 0,
  is_main     boolean not null default false
);

create index if not exists product_images_product_idx on public.product_images (product_id, sort_order);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_touch on public.products;
create trigger products_touch
  before update on public.products
  for each row execute function public.touch_updated_at();

-- Shoppers read products through this view. It hides products/categories the
-- admin set to hidden, and blanks the price columns when "Show price" is off,
-- so the admin's private reference price never reaches the browser.
-- (The base table is admin-only; the view runs with its owner's rights.)
create or replace view public.public_products
with (security_invoker = false)
as
select
  p.id,
  p.category_id,
  p.name,
  p.slug,
  p.description,
  case when p.show_price then p.price end       as price,
  case when p.show_price then p.sale_price end  as sale_price,
  (p.show_price and p.price is not null)        as show_price,
  p.sizes,
  p.colors,
  p.material,
  p.stock_status,
  p.is_featured,
  p.is_new,
  p.is_best_seller,
  p.view_count,
  p.created_at
from public.products p
left join public.categories c on c.id = p.category_id
where p.is_visible
  and (c.id is null or c.is_visible);

grant select on public.public_products to anon, authenticated;

-- Counts a product page view without giving shoppers write access.
create or replace function public.increment_product_view(p_slug text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.products set view_count = view_count + 1
  where slug = p_slug and is_visible;
$$;

grant execute on function public.increment_product_view(text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Favorites
-- -----------------------------------------------------------------------------
create table if not exists public.favorites (
  user_id     uuid not null references auth.users (id) on delete cascade,
  product_id  uuid not null references public.products (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- -----------------------------------------------------------------------------
-- Direct Ask chat
-- -----------------------------------------------------------------------------
create table if not exists public.conversations (
  id               uuid primary key default gen_random_uuid(),
  shopper_id       uuid not null references public.profiles (id) on delete cascade,
  status           text not null default 'open' check (status in ('open', 'resolved', 'archived')),
  last_message_at  timestamptz not null default now(),
  last_message     text,
  unread_admin     int not null default 0,
  unread_shopper   int not null default 0,
  created_at       timestamptz not null default now()
);

create index if not exists conversations_shopper_idx on public.conversations (shopper_id, last_message_at desc);

create table if not exists public.messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.conversations (id) on delete cascade,
  sender_id        uuid not null references public.profiles (id) on delete cascade,
  body             text,
  image_key        text,                      -- R2 object key
  product_id       uuid references public.products (id) on delete set null,
  -- Snapshot of the product card at the time of asking (name, image, price,
  -- link, size, color) so the card still renders if the product changes.
  product_snapshot jsonb,
  created_at       timestamptz not null default now(),
  read_at          timestamptz,
  check (body is not null or image_key is not null or product_id is not null)
);

create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at);

-- Keep conversation summary + unread counters in sync with new messages.
create or replace function public.on_message_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shopper uuid;
  v_preview text;
begin
  select shopper_id into v_shopper from public.conversations where id = new.conversation_id;

  v_preview := coalesce(
    nullif(left(new.body, 140), ''),
    case when new.image_key is not null then '📷 Photo' end,
    case when new.product_id is not null then '🛍️ Product inquiry' end
  );

  if new.sender_id = v_shopper then
    update public.conversations
       set last_message_at = new.created_at,
           last_message    = v_preview,
           unread_admin    = unread_admin + 1,
           status          = case when status = 'archived' then status else 'open' end
     where id = new.conversation_id;
  else
    update public.conversations
       set last_message_at = new.created_at,
           last_message    = v_preview,
           unread_shopper  = unread_shopper + 1
     where id = new.conversation_id;
  end if;
  return new;
end;
$$;

drop trigger if exists messages_after_insert on public.messages;
create trigger messages_after_insert
  after insert on public.messages
  for each row execute function public.on_message_insert();

-- Marks the other side's messages as read and resets the caller's counter.
create or replace function public.mark_conversation_read(p_conversation uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shopper uuid;
begin
  select shopper_id into v_shopper from public.conversations where id = p_conversation;
  if v_shopper is null then
    return;
  end if;

  if auth.uid() = v_shopper then
    update public.messages set read_at = now()
     where conversation_id = p_conversation and sender_id <> v_shopper and read_at is null;
    update public.conversations set unread_shopper = 0 where id = p_conversation;
  elsif public.is_admin() then
    update public.messages set read_at = now()
     where conversation_id = p_conversation and sender_id = v_shopper and read_at is null;
    update public.conversations set unread_admin = 0 where id = p_conversation;
  end if;
end;
$$;

grant execute on function public.mark_conversation_read(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Shop settings (single row, id = 1)
-- -----------------------------------------------------------------------------
create table if not exists public.shop_settings (
  id                   int primary key default 1 check (id = 1),
  shop_name            text not null default 'DMS',
  tagline              text not null default 'Direct Message Us',
  logo_key             text,                 -- R2 object key
  hero_image_key       text,                 -- R2 object key
  hero_headline        text not null default 'Cropped. Cozy. Couture.',
  hero_subtext         text,
  facebook_url         text,
  facebook_enabled     boolean not null default true,
  messenger_username   text,
  messenger_enabled    boolean not null default true,
  instagram_username   text,
  instagram_enabled    boolean not null default true,
  tiktok_url           text,
  tiktok_enabled       boolean not null default true,
  -- [{ "label": "Shopee", "url": "https://...", "enabled": true }]
  other_links          jsonb not null default '[]'::jsonb,
  phone                text,
  email                text,
  hours                text,
  location             text,
  how_to_order         text,
  payment_notes        text,
  shipping_notes       text,
  currency_code        text not null default 'PHP',
  currency_symbol      text not null default '₱',
  quick_replies        text[] not null default '{}',
  updated_at           timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Analytics + push
-- -----------------------------------------------------------------------------
create table if not exists public.dm_clicks (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid references public.products (id) on delete set null,
  channel     text not null check (channel in ('messenger', 'instagram', 'direct')),
  created_at  timestamptz not null default now()
);

create index if not exists dm_clicks_channel_idx on public.dm_clicks (channel, created_at desc);

create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now()
);

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.profiles            enable row level security;
alter table public.categories          enable row level security;
alter table public.products            enable row level security;
alter table public.product_images      enable row level security;
alter table public.favorites           enable row level security;
alter table public.conversations       enable row level security;
alter table public.messages            enable row level security;
alter table public.shop_settings       enable row level security;
alter table public.dm_clicks           enable row level security;
alter table public.push_subscriptions  enable row level security;

-- profiles
drop policy if exists "profiles: read own or admin" on public.profiles;
create policy "profiles: read own or admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
drop policy if exists "profiles: update own or admin" on public.profiles;
create policy "profiles: update own or admin" on public.profiles
  for update using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- categories: everyone reads visible ones, admins manage all
drop policy if exists "categories: public read" on public.categories;
create policy "categories: public read" on public.categories
  for select using (is_visible or public.is_admin());
drop policy if exists "categories: admin write" on public.categories;
create policy "categories: admin write" on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

-- products: base table is admin-only (shoppers use public_products view)
drop policy if exists "products: admin all" on public.products;
create policy "products: admin all" on public.products
  for all using (public.is_admin()) with check (public.is_admin());

-- product images: public read, admin write
drop policy if exists "product_images: public read" on public.product_images;
create policy "product_images: public read" on public.product_images
  for select using (true);
drop policy if exists "product_images: admin write" on public.product_images;
create policy "product_images: admin write" on public.product_images
  for all using (public.is_admin()) with check (public.is_admin());

-- favorites: own rows only
drop policy if exists "favorites: own" on public.favorites;
create policy "favorites: own" on public.favorites
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- conversations: shoppers see/create their own; admins see/update all
drop policy if exists "conversations: read own or admin" on public.conversations;
create policy "conversations: read own or admin" on public.conversations
  for select using (shopper_id = auth.uid() or public.is_admin());
drop policy if exists "conversations: shopper create" on public.conversations;
create policy "conversations: shopper create" on public.conversations
  for insert with check (shopper_id = auth.uid());
drop policy if exists "conversations: admin update" on public.conversations;
create policy "conversations: admin update" on public.conversations
  for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "conversations: admin delete" on public.conversations;
create policy "conversations: admin delete" on public.conversations
  for delete using (public.is_admin());

-- messages: participants read; senders write as themselves into their threads
drop policy if exists "messages: read participants" on public.messages;
create policy "messages: read participants" on public.messages
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.shopper_id = auth.uid()
    )
  );
drop policy if exists "messages: send" on public.messages;
create policy "messages: send" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and (
      public.is_admin()
      or exists (
        select 1 from public.conversations c
        where c.id = conversation_id and c.shopper_id = auth.uid()
      )
    )
  );

-- shop settings: public read, admin write
drop policy if exists "shop_settings: public read" on public.shop_settings;
create policy "shop_settings: public read" on public.shop_settings
  for select using (true);
drop policy if exists "shop_settings: admin write" on public.shop_settings;
create policy "shop_settings: admin write" on public.shop_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- dm clicks: anyone can log a click, only admins read
drop policy if exists "dm_clicks: anyone insert" on public.dm_clicks;
create policy "dm_clicks: anyone insert" on public.dm_clicks
  for insert with check (true);
drop policy if exists "dm_clicks: admin read" on public.dm_clicks;
create policy "dm_clicks: admin read" on public.dm_clicks
  for select using (public.is_admin());

-- push subscriptions: own rows only (server sends with the service role key)
drop policy if exists "push: own" on public.push_subscriptions;
create policy "push: own" on public.push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =============================================================================
-- Realtime
-- =============================================================================
do $$
begin
  begin
    alter publication supabase_realtime add table public.messages;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.conversations;
  exception when duplicate_object then null;
  end;
end $$;

-- Images live in Cloudflare R2 (bucket "dms-images"), not Supabase Storage.
-- Columns ending in _key / r2_key store the R2 object key; the site builds the
-- public URL from NEXT_PUBLIC_R2_PUBLIC_URL.
