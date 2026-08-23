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

// 2b. Learn library structured data (harness §8): breadcrumbs + per-page schema.
mustExist("lib/seo/jsonld.ts", "shared JSON-LD builders");
const learnShell = resolve(ROOT, "components/feature/learn/LearnContainer.tsx");
if (existsSync(learnShell)) {
  const t = readFileSync(learnShell, "utf8");
  if (!/breadcrumbLd|BreadcrumbList/.test(t)) fails.push("LearnContainer: no BreadcrumbList structured data");
} else {
  fails.push("missing components/feature/learn/LearnContainer.tsx");
}
const groundsIndex = resolve(ROOT, "app/learn/grounds/page.tsx");
if (existsSync(groundsIndex) && !/definedTermSetLd|DefinedTermSet/.test(readFileSync(groundsIndex, "utf8"))) {
  fails.push("Learn grounds index: no DefinedTermSet structured data");
}

// The built decode corpus supplies each FAQ page's facts; a page's check date is only
// meaningful relative to the entry behind it.
const corpusEntries = existsSync(resolve(ROOT, "corpus/index.json"))
  ? JSON.parse(readFileSync(resolve(ROOT, "corpus/index.json"), "utf8")).entries ?? []
  : [];

// 3. Every published FAQ page has the required frontmatter.
const faqDir = resolve(ROOT, "content/faq");
let faqCount = 0;
if (existsSync(faqDir)) {
  for (const f of readdirSync(faqDir).filter((x) => /\.(md|mdx)$/.test(x))) {
    faqCount++;
    const { data, content } = matter(readFileSync(resolve(faqDir, f), "utf8"));
    for (const key of ["title", "description", "question", "answer", "entryId"]) {
      if (!data[key] || String(data[key]).trim() === "")
        fails.push(`content/faq/${f}: frontmatter missing "${key}"`);
    }
    if (!Array.isArray(data.sources) || data.sources.length === 0)
      fails.push(`content/faq/${f}: must list ≥1 source (grounded)`);
    // An FAQ body is RENDERED, and react-markdown ESCAPES an HTML comment rather than
    // dropping it — so `<!-- ... -->` reaches the page as literal text. Three published
    // pages carried maintainer rationale this way, dates and all, in front of people
    // reading about a rent increase or a housing transfer. The draft gate in
    // lib/faq/validate.ts catches new drafts; this catches anything already published,
    // which is where the three that leaked were sitting.
    if (/<!--|-->/.test(content)) {
      fails.push(
        `content/faq/${f}: body contains an HTML comment — these RENDER as visible text`,
      );
    }
    // A "Last checked" date must not outrun the entry it rests on.
    //
    // Nine pages showed a check date LATER than the corpus entry that supplies their facts,
    // which tells a reader the page was reverified against current law when only the page
    // furniture had been touched. The honest direction is to lower the page's date, never to
    // raise the entry's — an entry's date moves when a human rechecks it against the source.
    if (data.entryId && data.updated) {
      const entry = corpusEntries.find((e) => e.id === data.entryId);
      if (entry && entry.lastVerified && String(data.updated) > String(entry.lastVerified)) {
        fails.push(
          `content/faq/${f}: "updated" ${data.updated} is later than ${data.entryId}'s ` +
            `lastVerified ${entry.lastVerified} — the page cannot be fresher than its source`,
        );
      }
    }
  }
}

if (fails.length) {
  console.error(`seo:check — ${fails.length} issue(s):\n  ` + fails.join("\n  "));
  process.exit(1);
}
console.log(`seo:check OK — sitemap/robots/FAQ template present; ${faqCount} FAQ page(s) valid.`);
