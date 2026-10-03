/**
 * Cloudflare Worker entry. Wraps the OpenNext-generated Next.js handler to add:
 *  1. a daily Cron Trigger that keeps the free Supabase project from pausing, and
 *  2. edge caching of public pages for signed-out visitors (needs a custom domain:
 *     the Cache API is a no-op on *.workers.dev).
 * Built by `opennextjs-cloudflare build`, then bundled by wrangler (see wrangler.jsonc "main").
 */

// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- the file only exists after a build
// @ts-ignore -- generated at build time by `opennextjs-cloudflare build`
import handler from "./.open-next/worker.js";

// Re-export OpenNext's Durable Object classes (unused by this app, required by the bundle).
// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- the file only exists after a build
// @ts-ignore -- generated at build time
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from "./.open-next/worker.js";

type Env = Record<string, unknown> & {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
};
type Ctx = { waitUntil(p: Promise<unknown>): void; passThroughOnException(): void };

const PUBLIC_PAGES = /^\/($|shop(\/|$)|product\/|delivery$)/;
const PAGE_TTL = 60; // seconds; admin edits show up within a minute

function isCacheable(request: Request, url: URL) {
  if (request.method !== "GET" || url.search) return false;
  if (!PUBLIC_PAGES.test(url.pathname)) return false;
  // Signed-in visitors (Supabase auth cookie) always get a fresh, personal page.
  const cookie = request.headers.get("cookie") ?? "";
  return !/sb-[^=]+-auth-token/.test(cookie);
}

const worker = {
  async fetch(request: Request, env: Env, ctx: Ctx): Promise<Response> {
    const url = new URL(request.url);
    if (!isCacheable(request, url)) return handler.fetch(request, env, ctx);

    const cache = (caches as unknown as { default: Cache }).default;
    const key = new Request(url.toString(), { method: "GET" });
    const hit = await cache.match(key);
    if (hit) return hit;

    const response: Response = await handler.fetch(request, env, ctx);
    const type = response.headers.get("content-type") ?? "";
    if (response.status === 200 && type.includes("text/html") && !response.headers.has("set-cookie")) {
      const copy = new Response(response.clone().body, response);
      copy.headers.set("Cache-Control", `public, s-maxage=${PAGE_TTL}`);
      ctx.waitUntil(cache.put(key, copy));
    }
    return response;
  },

  /** Daily keep-awake: a tiny read so Supabase sees activity (free projects pause after 7 idle days). */
  async scheduled(_event: unknown, env: Env, ctx: Ctx) {
    const base = env.NEXT_PUBLIC_SUPABASE_URL;
    const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!base || !key) {
      console.warn("keep-awake: Supabase secrets missing; run `wrangler secret bulk .dev.vars`");
      return;
    }
    ctx.waitUntil(
      fetch(`${base.replace(/\/$/, "")}/rest/v1/categories?select=id&limit=1`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      }).then((res) => console.log(`keep-awake: Supabase responded ${res.status}`)),
    );
  },
};

export default worker;
