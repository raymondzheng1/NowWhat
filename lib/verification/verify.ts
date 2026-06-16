import type { PathwayEntry } from "@/lib/schemas/corpus";
import { checkNoAdvice, checkNoAiMentions } from "@/lib/safety/no-advice";
import { fkGrade } from "@/lib/text/readability";
import { READING_GRADE } from "@/lib/config";

/**
 * The verifier — every output passes through this before display (CLAUDE.md "Do").
 * Grounded-or-silent + info-not-advice + never-an-unsourced-deadline, in code.
 *
 * Gates: source-allowlist · source-binding/provenance · no-out-of-corpus-citation ·
 * no-fabricated-deadline · jurisdiction · no-advice/no-prediction · no-AI-mention ·
 * reading-level. Any failure → caller regenerates from clean context, then falls back
 * to "not covered — here's who can help".
 */

export interface VerifyInput {
  /** All customer-visible prose in the candidate output, concatenated. */
  text: string;
  /** Source strings the output declares it relies on. */
  declaredSources: string[];
  /** The matched corpus entry (the allow-list of facts). */
  entry: PathwayEntry;
}

export interface VerifyFailure {
  gate: string;
  detail: string;
}
export interface VerifyResult {
  ok: boolean;
  failures: VerifyFailure[];
}

// State tribunals that must not appear in a Commonwealth answer.
const STATE_BODIES = ["vcat", "ncat", "qcat", "sacat", "sat ", "tascat"];
// Interstate tribunals that must not appear in a Victorian answer (VCAT is fine).
const OTHER_STATE_BODIES = ["ncat", "qcat", "sacat", "tascat"];

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

function allowedSourceBlob(entry: PathwayEntry): string {
  return norm(
    [
      ...entry.sources,
      ...entry.pathways.map((p) => p.source),
      entry.rightToReasons.source,
      entry.rightToReasons.provision,
      entry.reviewable.basis,
      ...entry.getHelp.map((h) => h.link),
    ].join(" | "),
  );
}

function allowedSourceList(entry: PathwayEntry): string[] {
  return [
    ...entry.sources,
    ...entry.pathways.map((p) => p.source),
    entry.rightToReasons.source,
    ...entry.getHelp.map((h) => h.link),
  ].map(norm);
}

const DOMAIN_RE = /\b[a-z0-9-]+(?:\.[a-z0-9-]+)+\b/g;

/**
 * Is a declared source grounded in the corpus entry? Models reword/shorten source
 * strings, so we don't require byte-equality (that rejected legitimate answers). A
 * source is grounded if it (a) overlaps a known source as a substring, (b) shares a
 * domain with a known source (the strongest real-source signal), or (c) has strong word
 * overlap with the allowed sources. A genuinely foreign citation matches none of these.
 * (The sources SHOWN to the user are always the canonical corpus ones, never these.)
 */
function sourceGrounded(d: string, allowList: string[], blob: string): boolean {
  if (allowList.some((a) => a.includes(d) || d.includes(a))) return true;
  const domains = d.match(DOMAIN_RE) ?? [];
  if (domains.some((dom) => dom.includes(".") && blob.includes(dom))) return true;
  const toks = d.split(/[^a-z0-9.]+/).filter((w) => w.length > 3);
  if (toks.length > 0) {
    const hits = toks.filter((w) => blob.includes(w)).length;
    if (hits / toks.length >= 0.6) return true;
  }
  return false;
}

function normUnit(u: string): string {
  const x = u.toLowerCase();
  if (x.startsWith("day")) return "day";
  if (x.startsWith("week")) return "week";
  if (x.startsWith("month")) return "month";
  if (x.startsWith("year")) return "year";
  return x;
}

const TIME_FIGURE_RE =
  /\b(\d{1,4})\s*(?:calendar|business|working)?\s*(day|days|week|weeks|month|months|year|years)\b/gi;

function collectFigures(text: string, into: Set<string>): void {
  for (const m of text.matchAll(TIME_FIGURE_RE)) {
    into.add(`${Number(m[1])} ${normUnit(m[2]!)}`);
  }
}

/**
 * Every time-figure the entry GROUNDS — collected from the entry's own customer-visible
 * text plus its verified deadlineDays. A model output may only state a time figure that
 * appears here; anything else is an unsourced/fabricated figure.
 */
function groundedTimeFigures(entry: PathwayEntry): Set<string> {
  const set = new Set<string>();
  const parts: string[] = [
    entry.reviewable.basis,
    entry.rightToReasons.how,
    entry.plainLanguageExplainer,
    entry.body,
    ...entry.groundsOrCriteria,
    ...entry.evidenceChecklist,
  ];
  for (const p of entry.pathways) {
    parts.push(p.deadline);
    if (p.howCounted) parts.push(p.howCounted);
    if (p.cost) parts.push(p.cost);
    if (p.deadlineVerified && typeof p.deadlineDays === "number") {
      set.add(`${p.deadlineDays} day`);
    }
  }
  collectFigures(parts.join("  "), set);
  return set;
}

export function verifyOutput(input: VerifyInput): VerifyResult {
  const failures: VerifyFailure[] = [];
  const { text, declaredSources, entry } = input;
  const t = norm(text);
  const blob = allowedSourceBlob(entry);

  // 1. Source allow-list — every declared source must be grounded in the entry's sources
  //    (substring, shared domain, or strong word overlap — models reword sources).
  const allowList = allowedSourceList(entry);
  for (const src of declaredSources) {
    const d = norm(src);
    if (!d) continue;
    if (!sourceGrounded(d, allowList, blob)) {
      failures.push({
        gate: "source-allowlist",
        detail: `cited a source not in the corpus entry: "${src}"`,
      });
    }
  }

  // 2. Provenance — a covered answer must declare at least one source.
  if (text.trim().length > 0 && declaredSources.filter((s) => s.trim()).length === 0) {
    failures.push({ gate: "source-binding", detail: "no source cited (content without provenance)" });
  }

  // 3. No out-of-corpus legal citation in the prose.
  const citationRe = /\b(?:section|sections|s\.?|ss\.?)\s?\d+[a-z]*\b|\b[A-Z][A-Za-z'’]+(?:\s+[A-Z][A-Za-z'’]+)*\s+Act\s+\d{4}\b/g;
  for (const m of text.match(citationRe) ?? []) {
    if (!blob.includes(norm(m))) {
      failures.push({
        gate: "no-out-of-corpus-citation",
        detail: `citation "${m.trim()}" is not grounded in the corpus entry`,
      });
    }
  }

  // 4. No fabricated/unsourced deadline. Every time figure in the prose must appear in
  //    the corpus entry's own grounded figures — otherwise it's an unsourced number.
  const grounded = groundedTimeFigures(entry);
  for (const m of text.matchAll(TIME_FIGURE_RE)) {
    const tok = `${Number(m[1])} ${normUnit(m[2]!)}`;
    if (!grounded.has(tok)) {
      failures.push({
        gate: "no-fabricated-deadline",
        detail: `states a time figure ("${m[0].trim()}") that is not grounded in the corpus entry`,
      });
    }
  }

  // 5. Jurisdiction — no cross-jurisdiction bodies.
  const jur = entry.jurisdiction.toLowerCase();
  if (jur.includes("victoria")) {
    for (const b of OTHER_STATE_BODIES) {
      if (t.includes(b)) {
        failures.push({ gate: "jurisdiction", detail: `mentions an interstate body "${b.trim()}" in a Victorian matter` });
      }
    }
  } else if (jur.includes("commonwealth")) {
    for (const b of STATE_BODIES) {
      if (t.includes(b)) {
        failures.push({ gate: "jurisdiction", detail: `mentions a state body "${b.trim()}" in a Commonwealth matter` });
      }
    }
  }

  // 6. No advice / no prediction (the tone gate) — the most important.
  const advice = checkNoAdvice(text);
  for (const h of advice.hits) {
    failures.push({ gate: "no-advice", detail: `${h.why}: "${h.match}"` });
  }

  // 7. No AI mentions.
  const ai = checkNoAiMentions(text);
  for (const h of ai.hits) {
    failures.push({ gate: "no-ai-mention", detail: `${h.why}: "${h.match}"` });
  }

  // 8. Reading level.
  const grade = fkGrade(text);
  if (grade != null && grade > READING_GRADE.ceiling) {
    failures.push({
      gate: "reading-level",
      detail: `too complex (grade ${grade.toFixed(1)} > ${READING_GRADE.ceiling})`,
    });
  }

  return { ok: failures.length === 0, failures };
}
