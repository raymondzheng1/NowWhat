import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/config";
import { getPublishedFaqs } from "@/lib/faq/load";

/**
 * sitemap.xml (harness §8). Stable lastModified (a content constant, not new Date()).
 * Private/bearer routes are not in scope here — every route listed is public.
 */
const CONTENT_UPDATED = "2026-06-16";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const staticRoutes = ["", "/start", "/chat", "/ask", "/decode", "/faq", "/help", "/about", "/contact", "/privacy", "/terms"];
  const pages: MetadataRoute.Sitemap = staticRoutes.map((r) => ({
    url: `${base}${r}`,
    lastModified: CONTENT_UPDATED,
    changeFrequency: "monthly",
    priority: r === "" ? 1 : 0.7,
  }));

  for (const faq of getPublishedFaqs()) {
    pages.push({
      url: `${base}/faq/${faq.slug}`,
      lastModified: faq.updated ?? CONTENT_UPDATED,
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }
  return pages;
}
