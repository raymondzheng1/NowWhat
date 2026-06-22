// Build the committed PROCEDURAL data index from data/pathways/*.md (TECHNICAL_SPEC §3).
// Separate from build-corpus (legal substance). Parses YAML frontmatter, builds the
// classification map (decisionMakers + decisionTypes + keywords + title) and writes
// data/index.json (diffable; builtAt is a content hash — harness §3.5).
//
// Authoritative schema validation is the Zod DataIndexSchema (lib/schemas/data.ts) via a
// vitest test. This script does structural checks so a malformed entry fails loudly here.

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import matter from "gray-matter";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = resolve(ROOT, "data/pathways");
const OUT = resolve(ROOT, "data/index.json");

const errors = [];
const fail = (m) => errors.push(m);
const asArray = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

function normalise(file, raw, body) {
  const e = { ...raw };
  e.body = (body ?? "").trim();
  e.decisionMakers = asArray(e.decisionMakers);
  e.decisionTypes = asArray(e.decisionTypes);
  e.keywords = asArray(e.keywords);
  e.forms = asArray(e.forms);
  e.mrCriteria = asArray(e.mrCriteria);
  e.getHelp = asArray(e.getHelp);
  e.status = e.status ?? "seed";
  e.isFallback = e.isFallback ?? false;
  e.privativeClause = e.privativeClause ?? false;
  if (e.avenue && e.avenue.noReviewEndpoint === undefined) e.avenue.noReviewEndpoint = null;

  const need = (cond, m) => {
    if (!cond) fail(`${file}: ${m}`);
  };
  need(typeof e.id === "string" && e.id.length, "missing id");
  need(typeof e.title === "string" && e.title.length, "missing title");
  need(e.jurisdiction === "Vic" || e.jurisdiction === "Cth", "jurisdiction must be Vic or Cth");
  need(e.decisionMakers.length >= 1, "needs ≥1 decisionMakers");
  need(e.decisionTypes.length >= 1, "needs ≥1 decisionTypes");
  need(e.avenue && e.avenue.mr && e.avenue.jr, "needs avenue.mr and avenue.jr");
  need(typeof e.deadlineRule === "string" && e.deadlineRule.length, "missing deadlineRule");
  need(typeof e.verifiedAsAt === "string" && e.verifiedAsAt.length, "missing verifiedAsAt");
  need(typeof e.sourceUrl === "string" && e.sourceUrl.length, "missing sourceUrl");
  need(Number.isInteger(e.reviewCadenceDays) && e.reviewCadenceDays > 0, "reviewCadenceDays must be a positive integer");
  need(e.reasonsRequest && typeof e.reasonsRequest.how === "string", "needs reasonsRequest.how");
  need(e.getHelp.length >= 1, "needs ≥1 getHelp service (always escalate)");
  return e;
}

function buildClassification(entries) {
  const tokens = [];
  const push = (token, entryId, kind) => {
    const t = String(token).trim().toLowerCase();
    if (t) tokens.push({ token: t, entryId, kind });
  };
  for (const e of entries) {
    if (e.isFallback) continue; // fallbacks are chosen explicitly, not by token match
    for (const d of e.decisionMakers) push(d, e.id, "decisionMaker");
    for (const d of e.decisionTypes) push(d, e.id, "decisionType");
    for (const k of e.keywords) push(k, e.id, "keyword");
    push(e.title, e.id, "title");
  }
  return tokens;
}

function main() {
  if (!existsSync(DIR)) {
    console.error(`build-data: ${DIR} not found`);
    process.exit(1);
  }
  const files = readdirSync(DIR)
    .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
    .sort();

  const entries = [];
  const seen = new Set();
  for (const f of files) {
    let parsed;
    try {
      parsed = matter(readFileSync(resolve(DIR, f), "utf8"));
    } catch (err) {
      fail(`${f}: frontmatter parse error — ${err.message}`);
      continue;
    }
    const e = normalise(f, parsed.data, parsed.content);
    if (seen.has(e.id)) fail(`${f}: duplicate id "${e.id}"`);
    seen.add(e.id);
    entries.push(e);
  }

  if (errors.length) {
    console.error("data build failed:\n  " + errors.join("\n  "));
    process.exit(1);
  }

  entries.sort((a, b) => a.id.localeCompare(b.id));
  const classification = buildClassification(entries);
  const payload = { entries, classification };
  const builtAt = createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 16);

  if (!existsSync(dirname(OUT))) mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify({ builtAt, ...payload }, null, 2) + "\n", "utf8");
  console.log(`Built data/index.json — ${entries.length} pathway entries, ${classification.length} classification tokens.`);
}

main();
