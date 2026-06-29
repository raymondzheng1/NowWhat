import { siteUrl, PRODUCT_NAME } from "@/lib/config";

/**
 * Reusable schema.org JSON-LD builders (harness §8). All URLs are absolute (built from
 * NEXT_PUBLIC_SITE_URL via siteUrl), as search engines require. Data is always built from
 * trusted, static/corpus values — never user input. Render with <JsonLd data={...} />.
 */

/** Stable content date (avoid new Date() so the markup is deterministic/diffable). */
export const SEO_CONTENT_DATE = "2026-06-16";

const organization = () => ({ "@type": "Organization", name: PRODUCT_NAME, url: siteUrl() });
const website = () => ({ "@type": "WebSite", name: PRODUCT_NAME, url: siteUrl() });

export type Crumb = { name: string; path: string };

export function breadcrumbLd(items: Crumb[]): Record<string, unknown> {
  const base = siteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${base}${it.path}`,
    })),
  };
}

export function articleLd(o: {
  headline: string;
  description: string;
  path: string;
  section?: string;
}): Record<string, unknown> {
  const base = siteUrl();
  const url = `${base}${o.path}`;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: o.headline,
    description: o.description,
    url,
    mainEntityOfPage: url,
    inLanguage: "en-AU",
    isPartOf: website(),
    publisher: organization(),
    datePublished: SEO_CONTENT_DATE,
    dateModified: SEO_CONTENT_DATE,
    ...(o.section ? { articleSection: o.section } : {}),
  };
}

export function faqPageLd(qa: { question: string; answer: string }[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: qa.map((x) => ({
      "@type": "Question",
      name: x.question,
      acceptedAnswer: { "@type": "Answer", text: x.answer },
    })),
  };
}

export function definedTermSetLd(o: {
  name: string;
  description: string;
  path: string;
  terms: { name: string; description: string; path: string }[];
}): Record<string, unknown> {
  const base = siteUrl();
  const setUrl = `${base}${o.path}`;
  return {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    name: o.name,
    description: o.description,
    url: setUrl,
    hasDefinedTerm: o.terms.map((t) => ({
      "@type": "DefinedTerm",
      name: t.name,
      description: t.description,
      url: `${base}${t.path}`,
      inDefinedTermSet: setUrl,
    })),
  };
}

export function itemListLd(o: {
  name: string;
  description?: string;
  items: { name: string; path: string }[];
}): Record<string, unknown> {
  const base = siteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: o.name,
    ...(o.description ? { description: o.description } : {}),
    itemListElement: o.items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      url: `${base}${it.path}`,
    })),
  };
}
