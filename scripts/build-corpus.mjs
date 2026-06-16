// Build the committed corpus index from corpus/pathways/*.md (TECHNICAL_SPEC §2).
// Parses YAML frontmatter, applies defaults, builds the classification map + flat
// source list, and writes corpus/index.json (diffable; builtAt is a content hash so
// it only changes when content changes — harness §3.5).
//
// Authoritative schema validation is done by the Zod schema in lib/schemas/corpus.ts
// via tests/unit/corpus/index-valid.test.ts (no drift). This script does structural
// checks so a malformed entry fails the build loudly here too.

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import matter from "gray-matter";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PATHWAYS_DIR = resolve(ROOT, "corpus/pathways");
const OUT = resolve(ROOT, "corpus/index.json");

const errors = [];
const fail = (msg) => errors.push(msg);

function asArray(v) {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function normaliseEntry(file, raw, body) {
  const e = { ...raw };
  e.body = (body ?? "").trim();
  e.status = e.status ?? "seed";
  e.keywords = asArray(e.keywords);
  e.groundsOrCriteria = asArray(e.groundsOrCriteria);
  e.evidenceChecklist = asArray(e.evidenceChecklist);
  e.decisionTypes = asArray(e.decisionTypes);
  e.issuers = asArray(e.issuers);
  e.pathways = asArray(e.pathways).map((p) => ({
    deadlineDays: p.deadlineDays ?? null,
    deadlineVerified: p.deadlineVerified ?? false,
    cost: p.cost,
    howCounted: p.howCounted,
    ...p,
  }));
  e.getHelp = asArray(e.getHelp);
  e.sources = asArray(e.sources);
  e.lastVerified = e.lastVerified ?? null;
  if (e.reviewable) e.reviewable.verified = e.reviewable.verified ?? false;
  if (e.rightToReasons)
    e.rightToReasons.verified = e.rightToReasons.verified ?? false;

  // Structural checks (Zod test is authoritative; these give a friendly build error).
  const need = (cond, m) => {
    if (!cond) fail(`${file}: ${m}`);
  };
  need(typeof e.id === "string" && e.id.length, "missing id");
  need(typeof e.title === "string" && e.title.length, "missing title");
  need(typeof e.jurisdiction === "string" && e.jurisdiction.length, "missing jurisdiction");
  need(e.decisionTypes.length >= 1, "needs ≥1 decisionTypes");
  need(e.issuers.length >= 1, "needs ≥1 issuers");
  need(e.pathways.length >= 1, "needs ≥1 pathways");
  need(e.getHelp.length >= 1, "needs ≥1 getHelp service");
  need(e.sources.length >= 1, "needs ≥1 sources");
  need(
    typeof e.plainLanguageExplainer === "string" && e.plainLanguageExplainer.length,
    "missing plainLanguageExplainer",
  );
  for (const [i, p] of e.pathways.entries()) {
    need(p.name && p.body && p.deadline && p.howToStart && p.source, `pathway[${i}] missing required field`);
  }
  return e;
}

function buildClassification(entries) {
  const tokens = [];
  const push = (token, entryId, kind) => {
    const t = String(token).trim().toLowerCase();
    if (t) tokens.push({ token: t, entryId, kind });
  };
  for (const e of entries) {
    for (const d of e.decisionTypes) push(d, e.id, "decisionType");
    for (const is of e.issuers) push(is, e.id, "issuer");
    for (const k of e.keywords) push(k, e.id, "keyword");
    push(e.title, e.id, "title");
  }
  return tokens;
}

function main() {
  const files = readdirSync(PATHWAYS_DIR)
    .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
    .sort();

  const entries = [];
  const seenIds = new Set();
  for (const f of files) {
    const full = resolve(PATHWAYS_DIR, f);
    let parsed;
    try {
      parsed = matter(readFileSync(full, "utf8"));
    } catch (err) {
      fail(`${f}: frontmatter parse error — ${err.message}`);
      continue;
    }
    const e = normaliseEntry(f, parsed.data, parsed.content);
    if (seenIds.has(e.id)) fail(`${f}: duplicate id "${e.id}"`);
    seenIds.add(e.id);
    entries.push(e);
  }

  if (errors.length) {
    console.error("Corpus build failed:\n  " + errors.join("\n  "));
    process.exit(1);
  }

  entries.sort((a, b) => a.id.localeCompare(b.id));
  const classification = buildClassification(entries);
  const sources = [...new Set(entries.flatMap((e) => e.sources))].sort();

  const payload = { entries, classification, sources };
  const builtAt = createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex")
    .slice(0, 16);

  const index = { builtAt, ...payload };
  writeFileSync(OUT, JSON.stringify(index, null, 2) + "\n", "utf8");
  console.log(
    `Built corpus/index.json — ${entries.length} entries, ${classification.length} classification tokens, ${sources.length} sources.`,
  );
}

main();
