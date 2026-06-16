import type { PathwayEntry } from "@/lib/schemas/corpus";
import { checkNoAdvice, checkNoAiMentions } from "@/lib/safety/no-advice";
import { fkGrade } from "@/lib/text/readability";
import { READING_GRADE } from "@/lib/config";

/**
 * Quality gates for a generated FAQ draft (FairGo's gold-standard pattern, adapted).
 * Pure + unit-tested. These pre-filter drafts BEFORE a human reviews them; the
 * authoritative publish gate is still `npm run verify` (which scans published FAQ for
 * no-advice / reading-level / links / SEO) + human review. Nothing auto-publishes.
 */
export interface FaqDraft {
  slug: string;
  question: string;
  answer: string;
  description: string;
  body: string;
}

export interface FaqGateFailure {
  gate: string;
  detail: string;
}

const TIME_RE =
  /\b(\d{1,4})\s*(?:calendar|business|working)?\s*(day|days|week|weeks|month|months|year|years)\b/gi;

function unit(u: string): string {
  const x = u.toLowerCase();
  return x.startsWith("day") ? "day" : x.startsWith("week") ? "week" : x.startsWith("month") ? "month" : "year";
}

/** Time-figures the entry grounds (so a draft can't invent a deadline). */
function groundedFigures(entry: PathwayEntry): Set<string> {
  const set = new Set<string>();
  const parts = [
    entry.reviewable.basis,
    entry.rightToReasons.how,
    entry.plainLanguageExplainer,
    entry.body,
    ...entry.groundsOrCriteria,
    ...entry.evidenceChecklist,
    ...entry.pathways.flatMap((p) => [p.deadline, p.howCounted ?? "", p.cost ?? ""]),
  ].join("  ");
  for (const m of parts.matchAll(TIME_RE)) set.add(`${Number(m[1])} ${unit(m[2]!)}`);
  for (const p of entry.pathways) {
    if (p.deadlineVerified && typeof p.deadlineDays === "number") set.add(`${p.deadlineDays} day`);
  }
  return set;
}

export function validateFaqDraft(args: {
  draft: FaqDraft;
  entry: PathwayEntry;
  publishedSlugs: string[];
}): FaqGateFailure[] {
  const { draft, entry, publishedSlugs } = args;
  const fails: FaqGateFailure[] = [];
  const prose = `${draft.question} ${draft.answer} ${draft.body}`;

  // 1. No advice / no prediction (the most important — the no-advice SoT).
  for (const h of checkNoAdvice(prose).hits) fails.push({ gate: "no-advice", detail: `${h.why}: "${h.match}"` });
  // 2. No AI / tech framing.
  for (const h of checkNoAiMentions(prose).hits) fails.push({ gate: "no-ai-mention", detail: `"${h.match}"` });

  // 3. Reading level.
  const grade = fkGrade(`${draft.answer} ${draft.body}`);
  if (grade != null && grade > READING_GRADE.ceiling) {
    fails.push({ gate: "reading-level", detail: `grade ${grade.toFixed(1)} > ${READING_GRADE.ceiling}` });
  }

  // 4. No fabricated deadline — every time-figure must be grounded in the entry.
  const grounded = groundedFigures(entry);
  for (const m of prose.matchAll(TIME_RE)) {
    const tok = `${Number(m[1])} ${unit(m[2]!)}`;
    if (!grounded.has(tok)) {
      fails.push({ gate: "no-fabricated-deadline", detail: `time figure "${m[0].trim()}" not grounded in ${entry.id}` });
    }
  }

  // 5. Structure — at least one section heading and a CTA into the tool.
  if (!/\n##\s/.test(`\n${draft.body}`)) fails.push({ gate: "structure", detail: "body has no '## ' section heading" });
  if (!draft.body.includes("/start")) fails.push({ gate: "cta", detail: "body has no link to /start" });

  // 6. Sanity lengths.
  if (draft.answer.length < 40 || draft.answer.length > 700) fails.push({ gate: "answer-length", detail: `${draft.answer.length} chars (want 40–700)` });
  if (draft.body.length < 300) fails.push({ gate: "body-length", detail: `${draft.body.length} chars (want ≥300)` });

  // 7. Dedupe — not already published.
  if (publishedSlugs.includes(draft.slug)) fails.push({ gate: "dedupe", detail: `slug "${draft.slug}" already published` });

  return fails;
}
