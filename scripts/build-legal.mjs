// Build the committed LEGAL-SUBSTANCE corpus index from corpus/legal/ (TECHNICAL_SPEC §3):
// grounds (corpus/legal/grounds/*.md) + triage (corpus/legal/_triage.md) → corpus/legal/index.json.
// Separate from build-corpus (the What Now? decode corpus) and build-data (procedural).
//
// SEED/v2: grounds carry no leading cases until populated from our materials + signed off.
// Authoritative validation is the Zod LegalIndexSchema via a vitest test.

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import matter from "gray-matter";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = resolve(ROOT, "corpus/legal");
const GROUNDS = resolve(DIR, "grounds");
const OUT = resolve(DIR, "index.json");

const errors = [];
const fail = (m) => errors.push(m);
const asArray = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

function main() {
  if (!existsSync(GROUNDS)) {
    console.error(`build-legal: ${GROUNDS} not found`);
    process.exit(1);
  }
  const files = readdirSync(GROUNDS).filter((f) => f.endsWith(".md") && !f.startsWith("_")).sort();

  const grounds = [];
  const seen = new Set();
  for (const f of files) {
    let g;
    try {
      g = matter(readFileSync(resolve(GROUNDS, f), "utf8")).data;
    } catch (err) {
      fail(`${f}: frontmatter parse error — ${err.message}`);
      continue;
    }
    g.elements = asArray(g.elements);
    g.leadingCases = asArray(g.leadingCases);
    g.status = g.status ?? "seed";
    if (!g.id) fail(`${f}: missing id`);
    if (!g.name || !g.plainName || !g.test) fail(`${f}: missing name/plainName/test`);
    if (g.elements.length < 1) fail(`${f}: needs ≥1 element`);
    if (seen.has(g.id)) fail(`${f}: duplicate id "${g.id}"`);
    seen.add(g.id);
    grounds.push(g);
  }

  let triage = null;
  const triagePath = resolve(DIR, "_triage.md");
  if (existsSync(triagePath)) triage = matter(readFileSync(triagePath, "utf8")).data;
  else fail("missing corpus/legal/_triage.md");

  if (errors.length) {
    console.error("legal corpus build failed:\n  " + errors.join("\n  "));
    process.exit(1);
  }

  grounds.sort((a, b) => a.id.localeCompare(b.id));
  const payload = { grounds, triage };
  const builtAt = createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 16);
  if (!existsSync(dirname(OUT))) mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify({ builtAt, ...payload }, null, 2) + "\n", "utf8");
  console.log(`Built corpus/legal/index.json — ${grounds.length} grounds.`);
}

main();
