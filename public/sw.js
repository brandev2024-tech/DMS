/* DMS service worker — app shell + image cache, offline fallback, push. */
const VERSION = "dms-v3";
const SHELL = `${VERSION}-shell`;
const PAGES = `${VERSION}-pages`;
const IMAGES = `${VERSION}-images`;
const MAX_IMAGES = 120;
const MAX_PAGES = 30;
const OFFLINE_URL = "/offline";
// Personal pages are never stored on the device.
const PRIVATE = ["/account", "/messages", "/login", "/register"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((c) => c.addAll([OFFLINE_URL, "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

function isImage(url, request) {
  return (
    request.destination === "image" ||
    url.pathname.startsWith("/demo/") ||
    // Product photos served from the R2 bucket (r2.dev or custom domain)
    url.hostname.endsWith(".r2.dev")
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Never cache auth, API, admin or Supabase data calls.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/") || url.pathname.startsWith("/admin")) return;
  // Supabase API/auth/realtime calls are always live.
  if (url.hostname.endsWith("supabase.co")) return;
  // Map tiles would crowd product photos out of the image cache.
  if (url.hostname.endsWith("openstreetmap.org")) return;

  // Pages: network first, fall back to cached copy, then the offline page.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok && url.origin === self.location.origin && !PRIVATE.some((p) => url.pathname.startsWith(p))) {
            const copy = res.clone();
            caches.open(PAGES).then((c) => c.put(request, copy)).then(() => trim(PAGES, MAX_PAGES));
          }
          return res;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match(OFFLINE_URL))),
    );
    return;
  }

  // Build assets & fonts are immutable: cache first.
  if (url.pathname.startsWith("/_next/static/") || request.destination === "font" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(SHELL).then((c) => c.put(request, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  // Recently viewed product photos: cache first, keep the newest ~120.
  if (isImage(url, request)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request)
            .then((res) => {
              if (res.ok || res.type === "opaque") {
                const copy = res.clone();
                caches.open(IMAGES).then((c) => c.put(request, copy)).then(() => trim(IMAGES, MAX_IMAGES));
              }
              return res;
            })
            .catch(() => Response.error()),
      ),
    );
  }
});

// The app asks us to keep favorite photos available offline.
self.addEventListener("message", (event) => {
  if (event.data?.type === "CACHE_URLS" && Array.isArray(event.data.urls)) {
    event.waitUntil(
      caches.open(IMAGES).then((c) =>
        Promise.all(event.data.urls.map((u) => c.match(u).then((hit) => hit || c.add(u).catch(() => {})))),
      ),
    );
  }
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data && event.data.text() };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "DMS 💌", {
      body: data.body || "You have a new message",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag,
      renotify: Boolean(data.tag),
      data: { url: data.url || "/messages" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
