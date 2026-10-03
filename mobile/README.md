# DMS – Direct Message Us · phone app

The iOS and Android app for the DMS boutique. It uses the **same Supabase database, the same R2 photos and the same website** as the DMS site. A product added in the app shows on the website, and the other way round.

- **Shopper mode** (works without logging in): Home, Shop, Favorites, Messages (Direct Ask), Account
- **Admin mode** (accounts with `role = 'admin'`): Dashboard, Products, Inbox, Settings

Built with Expo SDK 57, Expo Router, TypeScript, NativeWind, TanStack Query and Supabase.

> Nothing secret is inside the app. It only holds the public Supabase key, the R2 public URL and the website address. The Supabase **service role** key and the **R2 secret keys** stay on the server: photo uploads go through the website's presigned-URL route, and push notifications and account deletion run in Supabase Edge Functions.

---

## A. One-time setup (backend)

Do these once, in this order. Steps 1–3 take about 10 minutes.

### 1. Add the push-token table

In **Supabase → SQL Editor → New query**, run [`../supabase/migrations/0003_push_tokens.sql`](../supabase/migrations/0003_push_tokens.sql).

This is the only database change. It adds a `push_tokens` table (Row Level Security: each user only sees their own phones). It doesn't touch the existing tables.

### 2. Deploy the website update

From the project root (the folder above this one):

```bash
npm run deploy
```

The update:

- lets the upload routes accept the app's login token as well as the website cookie
- adds the `/privacy` and `/terms` pages that the stores require

### 3. Allow the app's sign-in links

In **Supabase → Authentication → URL Configuration → Redirect URLs**, add:

```
dms://**
exp://**
```

`dms://` is the installed app. `exp://` is Expo Go while testing. These are used by email confirmation, "Forgot password" and Google sign-in.

### 4. Push notifications (Edge Function + webhook)

You need the Supabase CLI login once:

```bash
npx supabase login
npx supabase link --project-ref eouxbibwdxnzdoaetgsk
```

Pick any long random password for the webhook, for example from <https://1password.com/password-generator>. Then:

```bash
npx supabase secrets set PUSH_WEBHOOK_SECRET=your-long-random-password
npx supabase functions deploy push-message --no-verify-jwt
npx supabase functions deploy delete-account --no-verify-jwt
```

If the deploy command complains about Docker, add `--use-api` to it.

Now create the webhook in **Supabase → Database → Webhooks → Create a new hook**:

| Field | Value |
|---|---|
| Name | `push-message` |
| Table | `messages` |
| Events | **Insert** only |
| Type | **Supabase Edge Functions** → `push-message` |
| HTTP headers | add `x-webhook-secret` = the same password as above |

Every new chat message, from the app or the website, now notifies the other side:

- shopper writes → all admins' phones
- admin replies → that shopper's phones

Tapping the notification opens the chat.

`delete-account` powers **Account → Delete my account**. Apple and Google both require it. It deletes the user, and the database removes their profile, favorites, chats and push tokens. Admin accounts can't be deleted from the app, so the shop can't lose its only admin by accident.

### 5. Sign-in providers (optional)

- **Google:** if Google sign-in already works on the website, it works in the app too (thanks to step 3).
- **Sign in with Apple:** Apple requires it on iPhone because Google sign-in is offered. Set it up when you have the Apple Developer account (section D):
  1. In **Apple Developer → Identifiers**, open `com.dms.shop` and enable **Sign in with Apple**.
  2. In **Supabase → Authentication → Providers → Apple**, turn it on and add `com.dms.shop` under **Client IDs**.

  The app uses the native Apple sign-in sheet, so no secret key is needed for that.

---

## B. Run the app on your own phone (Expo Go)

On your computer:

```bash
cd mobile
npm install
copy .env.example .env      # already done on this PC, with your public values
npx expo start
```

1. Install **Expo Go** from the App Store or Google Play.
2. Scan the QR code in the terminal: iPhone Camera app, or the Expo Go app on Android. The phone and the computer must be on the same Wi-Fi. If they can't be, run `npx expo start --tunnel`.

Everything works in Expo Go except:

- **push notifications** (Android Expo Go no longer supports them)
- **Sign in with Apple**

To test those, use a test build (section C).

---

## C. Build a test Android APK to share with friends

Cloud builds run on Expo's servers (EAS). The free plan includes a limited number of builds each month.

```bash
cd mobile
npx eas-cli@latest login         # create a free account at expo.dev if you don't have one
npx eas-cli@latest init          # links this folder to an EAS project
```

`eas init` prints a **project ID**. Put it in two places:

- `.env` → `EXPO_PUBLIC_EAS_PROJECT_ID=…`
- `eas.json` → `build.base.env` → add `"EXPO_PUBLIC_EAS_PROJECT_ID": "…"`

Push notifications need this ID.

Then build:

```bash
npx eas-cli@latest build -p android --profile preview
```

After about 15 minutes you get a link and a QR code. Anyone with the link can install the APK. Android asks them to allow "install unknown apps" once.

For a build with developer tools, which also supports push and Apple sign-in: `--profile development`.

---

## D. Build for iPhone in the cloud (no Mac needed)

You need an **Apple Developer Program** membership: **US$99 per year**, paid to Apple. Enroll at <https://developer.apple.com/programs/>.

```bash
npx eas-cli@latest build -p ios --profile production
```

EAS asks you to log in with your Apple ID. It then creates the certificates and the app ID (`com.dms.shop`) for you. When the build finishes:

```bash
npx eas-cli@latest submit -p ios --latest
```

This uploads the build to **App Store Connect → TestFlight**. Add testers there by email; they install with the TestFlight app.

---

## E. Publish to the stores

### Google Play

1. Create a **Google Play Console** account: **US$25 one-time**, at <https://play.google.com/console>.
2. **Create app** → name **DMS – Direct Message Us**, free, app.
3. Build the store version:

   ```bash
   npx eas-cli@latest build -p android --profile production
   ```

4. Upload the `.aab` file to **Testing → Internal testing** (the first upload must be done by hand). Later uploads can use `npx eas-cli@latest submit -p android --latest`.
5. Fill in the store listing:
   - **Privacy policy:** `https://dms.agriscope2026.workers.dev/privacy`
   - **Data safety:**
     - collected: name, email, phone (optional), address (optional), messages, photos (only those the user sends), app interactions
     - no data is sold
     - users can request deletion in the app (Account → Delete my account)
   - **App access:** give the reviewer a test shopper login
6. Promote from Internal testing to **Production** when you're happy.

### Apple App Store

1. In **App Store Connect → Apps**, the app appears after your first `eas submit`.
2. Fill in:
   - screenshots (6.7" and 6.5" iPhone)
   - description and keywords
   - **Privacy Policy URL:** `https://dms.agriscope2026.workers.dev/privacy`
   - **App Privacy:** the same answers as Google's Data safety
3. In **App Review Information**, add a demo shopper account. Write a note: *"Ordering happens by messaging the shop; there is no in-app payment."*
4. Pick the TestFlight build and **Submit for Review**.

Release builds: bump the `version` in `app.config.ts` for each store release. The build number goes up automatically (`autoIncrement`).

---

## F. Product links that open the app

Shared links like `https://dms.agriscope2026.workers.dev/product/cloud-cream-faux-fur-crop` open the app when it's installed, and the website otherwise. This needs two public values, added to the website's `.dev.vars`:

```
APPLE_TEAM_ID=XXXXXXXXXX          # Apple Developer → Membership details → Team ID
ANDROID_CERT_SHA256=AB:CD:…       # npx eas-cli credentials -p android → SHA-256 fingerprint
                                  # (once on Google Play, also add the one from Play Console → App integrity, comma-separated)
```

Then, from the project root:

```bash
npm run secrets
npm run deploy
```

The website now serves:

- `/.well-known/apple-app-site-association`
- `/.well-known/assetlinks.json`

Until these values are set, both return 404, which is harmless.

The app also opens these links:

| Link | Opens |
|---|---|
| `dms://product/<slug>` | that product |
| `dms://shop/<category-slug>` | the Shop tab, filtered |
| `dms://messages/<conversation-id>` | that chat |

---

## How it fits together

| Feature | How |
|---|---|
| Products, categories, settings | Same tables as the website. Shoppers read the `public_products` view, so hidden prices never reach the phone. |
| Photos | Picked from the camera or gallery. Catalog photos are cropped to 4:5 and resized to 1600 px with a 600 px thumbnail, then compressed to WebP (Android) or JPEG (iOS), usually 200–400 KB. They go **straight to R2** through the website's presigned URL. |
| Admin safety | Admin screens are hidden from shoppers, and every admin write is also blocked by Row Level Security for non-admins. |
| Chat | Supabase Realtime: live messages, read receipts ("Seen"), photos, product cards. Same conversations as the website inbox. |
| Messenger / Instagram | Copies the pre-written inquiry, then opens the app (`m.me` / `ig.me`, falling back to the profile, then the browser). **Share photo + message** downloads the real product photo and opens the share sheet, so the picture itself is sent. |
| Favorites | On the phone when logged out, synced to `favorites` when logged in (merged at login). |
| Offline | Products, categories, settings and favorites are cached on the phone (7 days), and photos are cached by `expo-image`. A "You're offline" banner shows. |
| Analytics | Product views (`increment_product_view`) and every inquiry button tap (`dm_clicks`), shown on the admin dashboard. |
| Dark mode | Follows the phone's setting, with the website's palette. |

### Project layout

```
mobile/
  app.config.ts          app name, bundle IDs, permissions text, deep links, plugins
  eas.json               development / preview (APK) / production profiles
  src/app/               screens (Expo Router)
    (tabs)/              shopper tabs: index (Home), shop, favorites, messages, account
    admin/(tabs)/        admin tabs: index (Dashboard), products, inbox, settings
    admin/product/[id]   add / edit product (photos from the phone)
    product/[slug]       product page + inquiry sheet
    messages/[id]        Direct Ask chat (shopper and admin)
  src/components/        UI pieces (product cards, chat, inquiry sheet, photo manager…)
  src/lib/               Supabase client, data queries, uploads, push, favorites, theme
  scripts/generate-icons.mjs   regenerates the icon / splash images
../supabase/functions/   push-message and delete-account Edge Functions
```

### Useful commands

```bash
npx expo start             # run in Expo Go
npx tsc --noEmit           # typecheck
npx expo lint              # lint
npx expo-doctor            # check the Expo setup
npx expo install --fix     # fix package versions after an Expo upgrade
```
