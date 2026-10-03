import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/format";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/account", "/messages", "/api/", "/auth/"] },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
