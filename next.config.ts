import fs from "node:fs";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

// One settings file for everything: `.dev.vars` (also uploaded as Worker secrets with
// `wrangler secret bulk .dev.vars`). Load it here so `next dev` and `next build` see
// the same values — NEXT_PUBLIC_* ones are baked into the browser bundle at build time.
try {
  for (const line of fs.readFileSync(".dev.vars", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
} catch {
  // No .dev.vars yet: the site runs in demo mode.
}

const nextConfig: NextConfig = {
  images: {
    // Photos are already compressed to WebP in the browser before upload, so no
    // paid image-resizing service (Cloudflare Images) is needed.
    unoptimized: true,
  },
};

export default nextConfig;

// Lets `next dev` use Cloudflare bindings (getCloudflareContext) via wrangler.
initOpenNextCloudflareForDev();
