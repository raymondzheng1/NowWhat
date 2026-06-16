import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/config";

/** robots.txt (harness §8). API routes are not content — keep crawlers out of them. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/"] },
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}
