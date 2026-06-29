// Collects every CUSTOMER-FACING copy string into {file, where, text} records, so the
// no-advice / no-ai-mentions / reading-level linters all scan one authoritative surface.
//
// Customer copy lives in exactly three places (harness §10 — no hardcoded UI strings):
//   1. the i18n message catalog (lib/i18n/messages/*.json) — all UI copy
//   2. published FAQ pages (content/faq/**/*.md(x))
//   3. the corpus's customer-visible fields (explainer, title, pathways, grounds, etc.)

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function walk(dir, exts) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = resolve(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full, exts));
    else if (exts.some((e) => name.endsWith(e))) out.push(full);
  }
  return out;
}

function flattenJsonStrings(value, path, file, out) {
  if (typeof value === "string") {
    out.push({ file, where: path, text: value });
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => flattenJsonStrings(v, `${path}[${i}]`, file, out));
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      flattenJsonStrings(v, path ? `${path}.${k}` : k, file, out);
    }
  }
}

/** @returns {{file:string, where:string, text:string}[]} */
export function collectCustomerCopy() {
  const records = [];

  // 1. i18n message catalogs
  for (const f of walk(resolve(ROOT, "lib/i18n/messages"), [".json"])) {
    const json = JSON.parse(readFileSync(f, "utf8"));
    flattenJsonStrings(json, "", relative(ROOT, f), records);
  }

  // 2. FAQ pages (frontmatter title/description/answer + body)
  for (const f of walk(resolve(ROOT, "content/faq"), [".md", ".mdx"])) {
    const { data, content } = matter(readFileSync(f, "utf8"));
    const rel = relative(ROOT, f);
    for (const key of ["title", "description", "question", "answer"]) {
      if (typeof data[key] === "string")
        records.push({ file: rel, where: `frontmatter.${key}`, text: data[key] });
    }
    records.push({ file: rel, where: "body", text: content });
  }

  // 3. Corpus customer-visible fields
  const idxPath = resolve(ROOT, "corpus/index.json");
  if (existsSync(idxPath)) {
    const idx = JSON.parse(readFileSync(idxPath, "utf8"));
    for (const e of idx.entries ?? []) {
      const rel = `corpus (entry ${e.id})`;
      const add = (where, text) => {
        if (typeof text === "string" && text.trim())
          records.push({ file: rel, where, text });
      };
      add("title", e.title);
      add("plainLanguageExplainer", e.plainLanguageExplainer);
      add("body", e.body);
      add("reviewable.basis", e.reviewable?.basis);
      (e.groundsOrCriteria ?? []).forEach((g, i) => add(`groundsOrCriteria[${i}]`, g));
      (e.evidenceChecklist ?? []).forEach((g, i) => add(`evidenceChecklist[${i}]`, g));
      (e.pathways ?? []).forEach((p, i) => {
        add(`pathways[${i}].name`, p.name);
        add(`pathways[${i}].howToStart`, p.howToStart);
        add(`pathways[${i}].deadline`, p.deadline);
      });
    }
  }

  // 4. Procedural data-layer customer-visible fields (the rule/reasons/criteria copy)
  const dataPath = resolve(ROOT, "data/index.json");
  if (existsSync(dataPath)) {
    const idx = JSON.parse(readFileSync(dataPath, "utf8"));
    for (const e of idx.entries ?? []) {
      const rel = `data (entry ${e.id})`;
      const add = (where, text) => {
        if (typeof text === "string" && text.trim()) records.push({ file: rel, where, text });
      };
      add("title", e.title);
      add("deadlineRule", e.deadlineRule);
      add("avenue.noReviewEndpoint", e.avenue?.noReviewEndpoint);
      add("reasonsRequest.how", e.reasonsRequest?.how);
      (e.mrCriteria ?? []).forEach((c, i) => add(`mrCriteria[${i}]`, c));
    }
  }

  // 5. Legal-substance "Learn" copy (processes, comparison, grounds)
  const legalPath = resolve(ROOT, "corpus/legal/index.json");
  if (existsSync(legalPath)) {
    const idx = JSON.parse(readFileSync(legalPath, "utf8"));
    const push = (rel, where, text) => {
      if (typeof text === "string" && text.trim()) records.push({ file: rel, where, text });
    };
    for (const p of idx.processes ?? []) {
      const rel = `legal (process ${p.id})`;
      push(rel, "oneLine", p.oneLine);
      push(rel, "whatItIs", p.whatItIs);
      [...(p.canApply ?? []), ...(p.whatHappens ?? []), ...(p.remedies ?? []), ...(p.limits ?? []), ...(p.goodToKnow ?? [])].forEach(
        (s, i) => push(rel, `point[${i}]`, s),
      );
    }
    const cmp = idx.comparison;
    if (cmp) {
      push("legal (comparison)", "intro", cmp.intro);
      (cmp.rows ?? []).forEach((r, i) => { push("legal (comparison)", `row[${i}].mr`, r.mr); push("legal (comparison)", `row[${i}].jr`, r.jr); });
      (cmp.chooser?.options ?? []).forEach((o, i) => push("legal (comparison)", `chooser[${i}]`, o.because));
    }
    for (const g of idx.grounds ?? []) {
      const rel = `legal (ground ${g.id})`;
      push(rel, "oneLine", g.oneLine);
      push(rel, "whatItMeans", g.whatItMeans);
      push(rel, "plainExample", g.plainExample);
      push(rel, "whatItIsNot", g.whatItIsNot);
      (g.whatRelates ?? []).forEach((s, i) => push(rel, `whatRelates[${i}]`, s));
      (g.elements ?? []).forEach((e, i) => push(rel, `element[${i}].layPrompt`, e.layPrompt));
    }
  }

  return records;
}

/** Load the shared no-advice / ai-mention pattern groups. */
export function loadPatterns() {
  const p = JSON.parse(
    readFileSync(resolve(ROOT, "lib/safety/no-advice-patterns.json"), "utf8"),
  );
  return p;
}
