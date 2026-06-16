import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import matter from "gray-matter";
import { FaqFrontmatterSchema, type FaqEntry } from "@/lib/faq/schema";

/**
 * Loads PUBLISHED FAQ pages (content/faq/*.md). Drafts under content/faq/_drafts are
 * never served (the review gate is structural — harness §9.2). Build-time only (SSG).
 */

const FAQ_DIR = resolve(process.cwd(), "content/faq");

function isPublished(file: string): boolean {
  return /\.(md|mdx)$/.test(file) && !file.startsWith("_");
}

let cache: FaqEntry[] | null = null;

export function getPublishedFaqs(): FaqEntry[] {
  if (cache) return cache;
  if (!existsSync(FAQ_DIR)) return (cache = []);
  const out: FaqEntry[] = [];
  for (const file of readdirSync(FAQ_DIR).filter(isPublished)) {
    const { data, content } = matter(readFileSync(resolve(FAQ_DIR, file), "utf8"));
    const fm = FaqFrontmatterSchema.parse(data);
    out.push({ ...fm, slug: file.replace(/\.(md|mdx)$/, ""), body: content.trim() });
  }
  out.sort((a, b) => a.title.localeCompare(b.title));
  return (cache = out);
}

export function getFaq(slug: string): FaqEntry | undefined {
  return getPublishedFaqs().find((f) => f.slug === slug);
}
