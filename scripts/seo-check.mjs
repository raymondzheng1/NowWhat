// SEO presence gate (harness §8; TECHNICAL_SPEC §7). Asserts the SEO scaffolding is
// present and every FAQ page carries the fields needed to rank + the required
// disclaimer / "get help" CTA / sources (PRD §6.8, launch gates).

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fails = [];

function mustExist(rel, why) {
  if (!existsSync(resolve(ROOT, rel))) fails.push(`missing ${rel} — ${why}`);
}

// 1. Site-level SEO scaffolding.
mustExist("app/sitemap.ts", "sitemap.xml generator (harness §8)");
mustExist("app/robots.ts", "robots.txt generator (harness §8)");

// 2. The FAQ page template must render canonical + disclaimer + CTA + sources.
const faqTemplate = resolve(ROOT, "app/faq/[slug]/page.tsx");
if (!existsSync(faqTemplate)) {
  fails.push("missing app/faq/[slug]/page.tsx — FAQ page template");
} else {
  const t = readFileSync(faqTemplate, "utf8");
  if (!/canonical/.test(t)) fails.push("FAQ template: no canonical URL declared");
  if (!/DISCLAIMER/.test(t)) fails.push("FAQ template: must render the DISCLAIMER constant");
  if (!/FAQPage|application\/ld\+json/.test(t)) fails.push("FAQ template: no FAQPage JSON-LD");
  if (!/(GetHelp|get.?help|\/help)/i.test(t)) fails.push("FAQ template: no 'get help' CTA/escalation");
}

// 3. Every published FAQ page has the required frontmatter.
const faqDir = resolve(ROOT, "content/faq");
let faqCount = 0;
if (existsSync(faqDir)) {
  for (const f of readdirSync(faqDir).filter((x) => /\.(md|mdx)$/.test(x))) {
    faqCount++;
    const { data } = matter(readFileSync(resolve(faqDir, f), "utf8"));
    for (const key of ["title", "description", "question", "answer", "entryId"]) {
      if (!data[key] || String(data[key]).trim() === "")
        fails.push(`content/faq/${f}: frontmatter missing "${key}"`);
    }
    if (!Array.isArray(data.sources) || data.sources.length === 0)
      fails.push(`content/faq/${f}: must list ≥1 source (grounded)`);
  }
}

if (fails.length) {
  console.error(`seo:check — ${fails.length} issue(s):\n  ` + fails.join("\n  "));
  process.exit(1);
}
console.log(`seo:check OK — sitemap/robots/FAQ template present; ${faqCount} FAQ page(s) valid.`);
