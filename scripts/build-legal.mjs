// Build the committed LEGAL-SUBSTANCE corpus index from corpus/legal/ (TECHNICAL_SPEC §3):
// processes (corpus/legal/processes/*.md), the MR-vs-JR comparison (corpus/legal/_comparison.md),
// grounds (corpus/legal/grounds/*.md), and the triage reference (corpus/legal/_triage.md)
// → corpus/legal/index.json. This is the single source for the "Learn" content, rendered
// deterministically across the library, the guided tour, and in-flow in the Rights Saver.
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
const PROCESSES = resolve(DIR, "processes");
const OUT = resolve(DIR, "index.json");

const errors = [];
const fail = (m) => errors.push(m);
const asArray = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

function readFront(dir, file) {
  return matter(readFileSync(resolve(dir, file), "utf8")).data;
}

function loadGrounds() {
  if (!existsSync(GROUNDS)) {
    fail(`${GROUNDS} not found`);
    return [];
  }
  const files = readdirSync(GROUNDS).filter((f) => f.endsWith(".md") && !f.startsWith("_")).sort();
  const grounds = [];
  const seen = new Set();
  for (const f of files) {
    let g;
    try {
      g = readFront(GROUNDS, f);
    } catch (err) {
      fail(`grounds/${f}: frontmatter parse error — ${err.message}`);
      continue;
    }
    g.whatRelates = asArray(g.whatRelates);
    g.usedIn = asArray(g.usedIn);
    g.elements = asArray(g.elements);
    g.leadingCases = asArray(g.leadingCases);
    g.sources = asArray(g.sources);
    g.whatItIsNot = g.whatItIsNot ?? "";
    g.status = g.status ?? "seed";
    const need = (c, m) => { if (!c) fail(`grounds/${f}: ${m}`); };
    need(g.id, "missing id");
    need(g.name && g.plainName && g.oneLine, "missing name/plainName/oneLine");
    need(g.whatItMeans && g.plainExample, "missing whatItMeans/plainExample");
    need(g.whatRelates.length >= 1, "needs ≥1 whatRelates prompt");
    need(g.usedIn.length >= 1, "needs ≥1 usedIn");
    need(g.test, "missing test");
    need(g.elements.length >= 1, "needs ≥1 element");
    if (seen.has(g.id)) fail(`grounds/${f}: duplicate id "${g.id}"`);
    seen.add(g.id);
    grounds.push(g);
  }
  return grounds;
}

function loadProcesses() {
  if (!existsSync(PROCESSES)) return [];
  const files = readdirSync(PROCESSES).filter((f) => f.endsWith(".md") && !f.startsWith("_")).sort();
  const out = [];
  const seen = new Set();
  for (const f of files) {
    let p;
    try {
      p = readFront(PROCESSES, f);
    } catch (err) {
      fail(`processes/${f}: frontmatter parse error — ${err.message}`);
      continue;
    }
    p.bodies = asArray(p.bodies);
    p.canApply = asArray(p.canApply);
    p.whatHappens = asArray(p.whatHappens);
    p.remedies = asArray(p.remedies);
    p.limits = asArray(p.limits);
    p.goodToKnow = asArray(p.goodToKnow);
    p.sources = asArray(p.sources);
    p.status = p.status ?? "seed";
    const need = (c, m) => { if (!c) fail(`processes/${f}: ${m}`); };
    need(p.id === "merits-review" || p.id === "judicial-review", "id must be merits-review or judicial-review");
    need(p.name && p.plainName && p.oneLine && p.question && p.whatItIs, "missing name/plainName/oneLine/question/whatItIs");
    need(p.bodies.length >= 1, "needs ≥1 body");
    need(p.canApply.length >= 1 && p.whatHappens.length >= 1 && p.remedies.length >= 1, "needs canApply/whatHappens/remedies");
    if (seen.has(p.id)) fail(`processes/${f}: duplicate id "${p.id}"`);
    seen.add(p.id);
    out.push(p);
  }
  return out;
}

function main() {
  const grounds = loadGrounds();
  const processes = loadProcesses();

  let comparison = null;
  const cmpPath = resolve(DIR, "_comparison.md");
  if (existsSync(cmpPath)) comparison = readFront(DIR, "_comparison.md");
  else fail("missing corpus/legal/_comparison.md");
  if (comparison) {
    comparison.intro = comparison.intro ?? "";
    comparison.rows = asArray(comparison.rows);
    if (!comparison.chooser || !Array.isArray(comparison.chooser.options) || comparison.chooser.options.length < 2)
      fail("_comparison.md: chooser needs a question + ≥2 options");
    if (comparison.rows.length < 1) fail("_comparison.md: needs ≥1 comparison row");
  }

  let triage = null;
  const triagePath = resolve(DIR, "_triage.md");
  if (existsSync(triagePath)) triage = readFront(DIR, "_triage.md");
  else fail("missing corpus/legal/_triage.md");

  if (errors.length) {
    console.error("legal corpus build failed:\n  " + errors.join("\n  "));
    process.exit(1);
  }

  grounds.sort((a, b) => a.id.localeCompare(b.id));
  processes.sort((a, b) => a.id.localeCompare(b.id));
  const payload = { processes, comparison, grounds, triage };
  const builtAt = createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 16);
  if (!existsSync(dirname(OUT))) mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify({ builtAt, ...payload }, null, 2) + "\n", "utf8");
  console.log(`Built corpus/legal/index.json — ${processes.length} processes, ${grounds.length} grounds, comparison + triage.`);
}

main();
