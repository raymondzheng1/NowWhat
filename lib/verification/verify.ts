import type { PathwayEntry, Pathway } from "@/lib/schemas/corpus";
import { deadlineIsRenderable } from "@/lib/schemas/corpus";
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

// State tribunals/bodies that must not appear in a Commonwealth answer (and vice versa).
const STATE_BODIES = ["vcat", "ncat", "qcat", "sacat", "sat ", "tascat"];

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

/** Verified, renderable day-counts the entry actually supports. */
function verifiedDeadlineDays(entry: PathwayEntry): number[] {
  return entry.pathways
    .filter((p: Pathway) => deadlineIsRenderable(p))
    .map((p) => p.deadlineDays as number);
}

export function verifyOutput(input: VerifyInput): VerifyResult {
  const failures: VerifyFailure[] = [];
  const { text, declaredSources, entry } = input;
  const t = norm(text);

  // 1. Source allow-list — every declared source maps to the entry's sources.
  const allowList = allowedSourceList(entry);
  for (const src of declaredSources) {
    const d = norm(src);
    if (!d) continue;
    const ok = allowList.some((a) => a.includes(d) || d.includes(a));
    if (!ok) {
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
  const blob = allowedSourceBlob(entry);
  const citationRe = /\b(?:section|sections|s\.?|ss\.?)\s?\d+[a-z]*\b|\b[A-Z][A-Za-z'’]+(?:\s+[A-Z][A-Za-z'’]+)*\s+Act\s+\d{4}\b/g;
  for (const m of text.match(citationRe) ?? []) {
    if (!blob.includes(norm(m))) {
      failures.push({
        gate: "no-out-of-corpus-citation",
        detail: `citation "${m.trim()}" is not grounded in the corpus entry`,
      });
    }
  }

  // 4. No fabricated/unsourced deadline. Any day/month count in the prose must equal a
  //    verified deadline the entry supports — otherwise it's an unsourced figure.
  const verified = verifiedDeadlineDays(entry);
  const dayRe = /\b(\d{1,4})\s*(calendar|business|working)?\s*(days?|months?|weeks?)\b/gi;
  for (const m of text.matchAll(dayRe)) {
    const n = Number(m[1]);
    const unit = (m[3] ?? "").toLowerCase();
    const days = unit.startsWith("month") ? n * 30 : unit.startsWith("week") ? n * 7 : n;
    if (!verified.includes(days) && !verified.includes(n)) {
      failures.push({
        gate: "no-fabricated-deadline",
        detail: `states a time figure ("${m[0].trim()}") that the corpus entry does not verify`,
      });
    }
  }

  // 5. Jurisdiction — no cross-jurisdiction bodies.
  if (/commonwealth/i.test(entry.jurisdiction)) {
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
