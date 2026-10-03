import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Pages are rendered per request (they read the visitor's session), so no ISR cache
// bucket is needed. Anonymous page caching is done in worker.ts with the Cache API.
export default defineCloudflareConfig();
