# DMS: Direct Message Us

An installable (PWA) boutique storefront for cropped fur and faux-fur jackets. Shoppers don't check out. They browse, then **message the seller** on Facebook Messenger, Instagram, or the built-in **Direct Ask** chat.

- **Shopper side:** home page, catalog with filters, product pages, the "Your Inquiry" DM flow, drop-off points map, accounts, favorites, and real-time chat
- **Admin panel** (`/admin`): dashboard, products, categories, inbox, drop-off points, and shop settings and social links

**Everything runs on free plans:**

| Piece | Service |
|---|---|
| Hosting | **Cloudflare Workers** (via `@opennextjs/cloudflare`), on a free `*.workers.dev` address |
| Database, login, live chat, security | **Supabase** (Postgres, Auth, Realtime, Row Level Security) |
| Pictures | **Cloudflare R2**, bucket `dms-images` (10 GB free). Supabase Storage is not used. |
| Keep-awake | A daily **Cloudflare Cron Trigger** so the free Supabase project never pauses |

**Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Supabase, Cloudflare Workers + R2, Leaflet maps, and a hand-written service worker.

> The seller's how-to lives in **[SELLER_GUIDE.md](SELLER_GUIDE.md)**.

> **This project is separate from the other project on your Cloudflare account.** It creates only its own resources: a Worker named `dms`, an R2 bucket named `dms-images`, and an R2 API token limited to that bucket. It doesn't read, change, or reuse anything belonging to your other project. If a Worker called `dms` already exists in the account, change `"name"` (and the `service` under `services`) in [`wrangler.jsonc`](wrangler.jsonc) before deploying.

## Quick look: demo mode

```bash
npm install
npm run dev        # http://localhost:3000
```

Without a `.dev.vars` file the site runs in **demo mode**: 12 sample products with pictures, 8 categories, shop settings, and 12 drop-off points around Baguio and La Trinidad, served from [`src/lib/demo-data.ts`](src/lib/demo-data.ts). You can browse everything, including the DM flow and the map. Accounts, Direct Ask, favorites, uploads, and the admin need the setup below.

---

## 1. Supabase: database, login, live chat

1. At [supabase.com](https://supabase.com), create a **new project named `dms`** on the free plan.
2. Open **SQL Editor → New query** and run these files **in order**. All three are safe to run again.
   1. [`supabase/migrations/0001_schema.sql`](supabase/migrations/0001_schema.sql): tables, Row Level Security, triggers, realtime
   2. [`supabase/migrations/0002_drop_points.sql`](supabase/migrations/0002_drop_points.sql): drop-off points and couriers
   3. [`supabase/seed.sql`](supabase/seed.sql): categories, settings, 12 sample products, 12 drop-off points
3. Open **Project Settings → API** and copy the **Project URL**, the **anon public** key, and the **service_role** key.
4. Under **Authentication → URL Configuration**:
   - **Site URL:** `https://dms.YOUR-SUBDOMAIN.workers.dev` (your Worker address; see step 5)
   - **Redirect URLs:** add `http://localhost:3000/auth/callback` and `https://dms.YOUR-SUBDOMAIN.workers.dev/auth/callback`
5. **Optional: Google sign-in.** Under **Authentication → Providers → Google**, paste a Google OAuth client ID and secret. In Google Cloud Console, add `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback` as a redirect URI.

## 2. Cloudflare R2: pictures

Use your existing Cloudflare account, but create new resources only for DMS. First, log Wrangler into that account:

```bash
npx wrangler login
npx wrangler whoami          # if several accounts are listed, set CLOUDFLARE_ACCOUNT_ID to the one to use
```

1. **Create the bucket:**
   ```bash
   npx wrangler r2 bucket create dms-images
   ```
2. **Turn on public access** (gives the bucket an `https://pub-….r2.dev` address):
   ```bash
   npx wrangler r2 bucket dev-url enable dms-images
   npx wrangler r2 bucket dev-url get dms-images      # copy this URL
   ```
   The `r2.dev` address is rate-limited and meant for getting started. For a busy shop, connect a custom domain under **R2 → dms-images → Settings → Custom Domains**, then use that URL instead.
3. **Allow uploads from the site (CORS).** In [`r2-cors.json`](r2-cors.json), replace `YOUR-SUBDOMAIN` with your workers.dev subdomain (and add a custom domain if you have one), then run:
   ```bash
   npx wrangler r2 bucket cors set dms-images --file r2-cors.json
   ```
4. **Create an API token for this bucket only.** In the dashboard, go to **R2 → Manage API tokens → Create API token**:
   - Permission: **Object Read & Write**
   - Specify bucket: **only `dms-images`**
   - Copy the **Access Key ID** and **Secret Access Key**, and note the **Account ID** shown on the R2 page.

How uploads work: the browser compresses each photo to WebP (max 1600px, plus a 600px thumbnail). It then asks `/api/uploads/presign` for upload links. That route checks the user is logged in, requires an admin for product, category, and branding photos, and accepts only WebP, JPEG, or PNG up to 2.5 MB. It returns presigned URLs that expire after 5 minutes. The browser uploads straight to R2, and only the object key is saved in Supabase. The R2 secret keys never leave the server.

## 3. Secrets

```bash
cp .dev.vars.example .dev.vars
```

Fill in `.dev.vars` (template: [`.dev.vars.example`](.dev.vars.example)). This one file is used everywhere:

| Variable | Server only? | What it's for |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | no (public) | Supabase connection |
| `SUPABASE_SERVICE_ROLE_KEY` | **yes** | Push notifications only |
| `NEXT_PUBLIC_SITE_URL` | no | `https://dms.YOUR-SUBDOMAIN.workers.dev`, used for DM product links, Open Graph previews, and the sitemap |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | **yes** | Signing R2 upload URLs |
| `R2_BUCKET` | yes | `dms-images` |
| `NEXT_PUBLIC_R2_PUBLIC_URL` | no | The `r2.dev` URL (or custom domain) from step 2 |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_JWK`, `VAPID_SUBJECT` | private key: **yes** | Optional push notifications. Generate with `npx @pushforge/builder vapid` and paste the private JWK on one line. |

- `npm run dev` and the Cloudflare build read `.dev.vars` (see [`next.config.ts`](next.config.ts)). `NEXT_PUBLIC_*` values are baked into the site at build time.
- `npm run secrets` (`wrangler secret bulk .dev.vars`) uploads the same values to the Worker as encrypted secrets. The server code and the daily cron read them from there.
- `.dev.vars` is git-ignored. Never commit it.

## 4. Create the first admin

1. Run the site (`npm run dev`) or deploy it (step 5), and **register** with the seller's email at `/register`.
2. In Supabase **SQL Editor**, run:
   ```sql
   update public.profiles
   set role = 'admin'
   where id = (select id from auth.users where email = 'seller@example.com');
   ```
3. Log out and back in. The dashboard icon appears in the header, and `/admin` is unlocked.

Shoppers can never promote themselves: a database trigger blocks role changes unless an admin or the SQL editor makes them.

## 5. Deploy to Cloudflare Workers

```bash
npm run secrets      # upload .dev.vars as Worker secrets (repeat whenever they change)
npm run deploy       # opennextjs-cloudflare build && deploy (uses wrangler.jsonc)
```

1. The first deploy prints your address, `https://dms.YOUR-SUBDOMAIN.workers.dev`. If `NEXT_PUBLIC_SITE_URL`, the Supabase URLs from step 1, or the R2 CORS origins from step 2 used a placeholder, update them, then run `npm run secrets` and `npm run deploy` again.
2. **Confirm the keep-awake cron is running:**
   - Go to **Workers & Pages → dms → Settings → Triggers**. **Cron Triggers** should show `0 3 * * *` (daily at 03:00 UTC, 11:00 AM Philippine time).
   - After it first fires, **Workers & Pages → dms → Logs** shows `keep-awake: Supabase responded 200`.
   - To test it right away on your computer, run `npm run preview` in one terminal, then:
     ```bash
     curl "http://localhost:8787/__scheduled?cron=0+3+*+*+*"
     ```
     If the Supabase secrets are missing, the log says so.
3. **Messenger link previews:** Messenger reads each product page's Open Graph tags, which only works on a public URL. Paste a product link into the [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) to check or refresh a preview.

Optional: add a custom domain under **Workers & Pages → dms → Settings → Domains & Routes**. With a custom domain, public pages are also cached at the edge for 60 seconds for signed-out visitors (see [`worker.ts`](worker.ts)). The Cache API doesn't run on `*.workers.dev`.

### Staying on the free plans

- **Worker size:** the build is about 1.8 MiB compressed, under the free 3 MiB limit. `next/image` runs with `unoptimized: true`, so no paid Cloudflare Images or image-resizing service is used.
- **R2:** photos are about 200–400 KB plus a small thumbnail, so the free 10 GB holds tens of thousands of photos. Removing photos from a product deletes them from R2.
- **Supabase:** the cron keeps the free project awake. Realtime is used only while a chat is open.

---

## How it works

### The DM flow

All three DM buttons open a **Your Inquiry** modal. It shows the product photo, name, price, and the chosen size and color, plus an editable pre-written message containing the product link and photo URL.

| Button | What happens |
|---|---|
| **Messenger** | Copies the message to the clipboard, shows a toast, and opens `https://m.me/<username>?text=<message>`. The product link unfurls into a preview with the photo. |
| **Instagram** | Instagram can't pre-fill text, so it copies the message, shows "Inquiry copied! Paste it in our Instagram chat 💌", and opens `https://ig.me/m/<username>`. |
| **Direct Ask** | Signed-out shoppers are asked to register. Signed-in shoppers have the product card posted into their conversation, followed by their question. |

Each click is logged in `dm_clicks` for the dashboard. A button hides when its username isn't set or is switched off in Settings.

### Hidden prices stay private

Shoppers never read the `products` table directly. They read the `public_products` view instead, which:

- returns `price` and `sale_price` as `null` whenever **Show price** is off, so the seller's private price never reaches the browser
- hides products, and products in categories, that are set to hidden

The base table is admin-only under RLS.

### Security model (RLS)

| Table | Shopper / visitor | Admin |
|---|---|---|
| `products` | none (uses `public_products`) | full |
| `categories`, `product_images`, `shop_settings` | read | full |
| `favorites`, `push_subscriptions` | own rows | own rows |
| `conversations` | read and create own | read and update all |
| `messages` | read and send in own threads, as themselves | read and send in all |
| `dm_clicks` | insert only | read |
| `drop_points` | read active | full |
| R2 `products/`, `categories/`, `branding/` | public read | upload via presigned URL, delete |
| R2 `chat/<user id>/…` | upload to own folder; public read via unguessable file names | same |

Unread counters, the last-message preview, and read receipts are maintained by triggers and the `mark_conversation_read()` function, so clients can't tamper with them.

### PWA

- The manifest comes from `src/app/manifest.ts`, with static icons in `public/icons/`.
- The service worker lives at `public/sw.js`:
  - pages are network-first, falling back to the `/offline` page
  - build assets and fonts are cache-first
  - the newest ~120 product photos (R2 and `/demo`) are cached
  - favorite photos are kept for offline viewing
  - push notifications are shown, and tapping one opens the chat
- Account, messages, and admin pages are never cached on the device.

### Sample photos

Seed and demo products use image keys starting with `demo/`, served as static WebP files from `public/demo/` (about 870 KB in total, each with a `_thumb` version). They're minimal studio-style illustrations, not real photos. Real uploads go to R2 and replace them as the seller edits each product.

### Drop-off points map

- `drop_points` rows appear on the home page ("Pick up near you") and on `/delivery`, using Leaflet with OpenStreetMap tiles shown in monochrome.
- The admin manages them at `/admin/drop-points`: tap the map to place a pin, or drag it.
- The sample points use placeholder names in real Baguio, La Trinidad, Tuba, Itogon, Sablan, and Tublay locations. Replace them with real partner shops before launch.
- OpenStreetMap's public tiles are fine for a small shop. For heavy traffic, switch the tile URL in [`src/components/drop-points/drop-map.tsx`](src/components/drop-points/drop-map.tsx) to a provider such as MapTiler or Stadia (free tiers, API key required).

### Project layout

```
supabase/
  migrations/0001_schema.sql      schema + RLS + triggers + realtime
  migrations/0002_drop_points.sql drop-off points + couriers
  seed.sql                        categories, settings, sample products, drop-off points
worker.ts                         Worker entry: daily keep-awake cron + public page cache
wrangler.jsonc                    Worker name, cron, assets (no secrets)
open-next.config.ts               OpenNext adapter config
r2-cors.json                      CORS rules for the dms-images bucket
public/sw.js, public/_headers     service worker; static asset cache headers
public/demo, public/icons         sample photos; app icons
src/middleware.ts                 Supabase session refresh + redirect for private pages
src/app/(shop)/…                  storefront, delivery map, auth, account, messages
src/app/admin/…                   admin panel (role checked on the server in layout)
src/app/api/uploads/presign       presigned R2 upload URLs (auth + type/size checks)
src/app/api/uploads/delete        admin-only R2 cleanup
src/app/api/push/notify           web push (PushForge, Web Crypto) to the other side of a chat
src/components/…                  UI (catalog, product, chat, admin, account, map)
src/lib/…                         Supabase + R2 clients, image URLs, data loaders, demo data, types
```

### Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server (http://localhost:3000) |
| `npm run preview` | Build for Cloudflare and run the real Worker locally (http://localhost:8787) |
| `npm run deploy` | Build for Cloudflare and deploy the `dms` Worker |
| `npm run secrets` | Upload `.dev.vars` to the Worker as encrypted secrets |
| `npm run lint` | ESLint |
# DMS
