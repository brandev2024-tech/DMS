-- =============================================================================
-- DMS — drop-off points & partners (Baguio, La Trinidad and nearby) + couriers
-- Run after 0001_schema.sql. Safe to re-run.
-- =============================================================================

create table if not exists public.drop_points (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  kind        text not null default 'drop_point' check (kind in ('drop_point', 'partner')),
  area        text not null,               -- e.g. "Baguio City", "La Trinidad"
  address     text,
  landmark    text,
  schedule    text,                        -- e.g. "Mon–Sat, 10AM–6PM"
  notes       text,
  lat         double precision not null,
  lng         double precision not null,
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table public.drop_points enable row level security;

drop policy if exists "drop_points: public read" on public.drop_points;
create policy "drop_points: public read" on public.drop_points
  for select using (is_active or public.is_admin());
drop policy if exists "drop_points: admin write" on public.drop_points;
create policy "drop_points: admin write" on public.drop_points
  for all using (public.is_admin()) with check (public.is_admin());

-- Couriers shown under "Shipping" (editable in Admin → Settings).
alter table public.shop_settings
  add column if not exists couriers text[] not null default array['J&T Express', 'LBC'];
