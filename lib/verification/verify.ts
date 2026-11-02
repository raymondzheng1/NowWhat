import { numberWordsToDigits } from "@/lib/text/numbers";
import type { PathwayEntry } from "@/lib/schemas/corpus";
import { checkNoAdvice, checkNoAiMentions, checkNoScore } from "@/lib/safety/no-advice";
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
  /**
   * Extra sources this output is entitled to rely on, beyond the pathway entry.
   *
   * The allow-list is built from a decode-corpus PathwayEntry, which knows nothing about the
   * legal-substance corpus. So an output that legitimately draws on a GROUND — its name, its
   * plain-English test — had no way to declare where that came from: the source-binding and
   * out-of-corpus gates would either reject honest text or wave it through unchecked. Callers
   * working from corpus/legal pass the sources of the grounds they actually used.
   */
  extraSources?: string[];
  /**
   * This output makes no legal claim, so it has nothing to cite.
   *
   * Provenance exists because an ANSWER that states the law must say where the law came
   * from. A LETTER states none: it is the person telling an agency what happened to them and
   * asking them to look again. Demanding a citation there would reject every honest draft,
   * and the only way to satisfy it would be to attach a source the letter does not rely on —
   * provenance theatre, which is worse than none.
   *
   * Every other gate still runs. This turns off one check, for outputs that assert nothing
   * to check it against.
   */
  citesNothing?: boolean;
  /**
   * The corpus material this output was GIVEN — for the analysis, the memo context built from
   * our own knowledge base. A section, an Act or a time figure that appears in it is grounded
   * by definition: it is the curated, lawyer-signed text, not something the model reached for.
   *
   * Without this the allow-list was the decode-corpus entry alone, which knows nothing of the
   * legal corpus or of the data layer's verified time rule — so an analysis that repeated the
   * rule it had been handed ("Order 56 … 60 days") failed `no-fabricated-deadline`.
   */
  groundedText?: string;
  /**
   * What the person told us. Their account is THEIR fact, not our claim: an Act they say the
   * council relied on, the fifteen years they have bred cats, a sentence an officer said to
   * them. Restating it is not citing law or stating a deadline, and refusing it refused the
   * analysis on every realistic account (measured by the judicial-review benchmark).
   *
   * Narrow allowances, and only these:
   *   · a citation or a time figure that appears in their words;
   *   · an advice-shaped phrase that the output QUOTES (inside double quotes) and that they
   *     wrote — the officer said "you should never be allowed to breed" is reporting, not
   *     advising.
   * Everything else — no-score, jurisdiction, AI mentions, and advice in our own voice — is
   * checked exactly as before.
   */
  accountText?: string;
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

function allowedSourceBlob(entry: PathwayEntry, extra: string[] = []): string {
  return norm(
    [
      ...extra,
      ...entry.sources,
      ...entry.pathways.map((p) => p.source),
      entry.rightToReasons.source,
      entry.rightToReasons.provision,
      entry.reviewable.basis,
      ...entry.getHelp.map((h) => h.link),
    ].join(" | "),
  );
}

function allowedSourceList(entry: PathwayEntry, extra: string[] = []): string[] {
  return [
    ...extra,
    ...entry.sources,
    ...entry.pathways.map((p) => p.source),
    entry.rightToReasons.source,
    ...entry.getHelp.map((h) => h.link),
  ].map(norm);
}

/** The spans an output puts inside double quotes — straight or curly. */
const QUOTED_RE = /["\u201c]([^"\u201c\u201d]{2,600})["\u201d]/g;

/**
 * The output with every quoted span that THEY wrote taken out. Advice is then checked on what
 * is left — our own voice — so a quoted "you should" is excused and an unquoted one beside it
 * is not. A quoted phrase the model made up stays in, and is checked like anything else.
 */
function withoutTheirQuotes(text: string, theirs: string): string {
  if (!theirs) return text;
  return text.replace(QUOTED_RE, (whole, inner: string) => (theirs.includes(norm(inner)) ? " " : whole));
}

/** Words only: lower case, punctuation gone, single spaces. */
const bare = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

const REPORTING = /\b(said|says|told|tells|wrote|writes|posted|posts|emailed|stated|states|claimed|claims|called|reported|according to)\b/i;
const MODAL_RUN = /\b(should|must|ought to|need to)\b(?:\s+[^\s.!?]+){3}/gi;

/**
 * The output with REPORTED SPEECH from their account taken out — a sentence that says who
 * said it, and whose "should …" continues in words they wrote.
 *
 * Writing to "you", the analysis turns an officer's post — that the Lotus Cattery operator
 * "should never be allowed to breed animals" — into "he posted that you should never be
 * allowed to breed". That is reporting what someone else said, but it no longer matches
 * their account word for word, so the quote allowance missed it and the analysis was refused
 * (the judicial-review benchmark, re-run 2026-11-01). Both conditions are needed: a reporting
 * verb in the sentence, and the modal and the three words after it found in their account.
 * "You should apply to VCAT" has neither.
 */
function withoutReportedSpeech(text: string, theirs: string): string {
  if (!theirs) return text;
  const theirsBare = bare(theirs);
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => {
      if (!REPORTING.test(s)) return s;
      const runs = [...s.matchAll(MODAL_RUN)].map((m) => bare(m[0]));
      return runs.length && runs.every((r) => theirsBare.includes(r)) ? " " : s;
    })
    .join(" ");
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
  for (const m of numberWordsToDigits(text).matchAll(TIME_FIGURE_RE)) {
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
  const { text, declaredSources, entry, extraSources = [] } = input;
  const t = norm(text);
  const blob = allowedSourceBlob(entry, extraSources);
  const given = norm(input.groundedText ?? "");
  const theirs = norm(input.accountText ?? "");
  // A citation is grounded if our corpus material holds it, or the person said it.
  const inGivenOrTheirs = (s: string) => {
    const n = norm(s);
    return (!!given && given.includes(n)) || (!!theirs && theirs.includes(n));
  };

  // 1. Source allow-list — every declared source must be grounded in the entry's sources
  //    (substring, shared domain, or strong word overlap — models reword sources).
  const allowList = allowedSourceList(entry, extraSources);
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

  // 2. Provenance — a covered answer must declare at least one source. Skipped only for
  //    outputs that make no legal claim at all; see `citesNothing`.
  if (!input.citesNothing && text.trim().length > 0 && declaredSources.filter((s) => s.trim()).length === 0) {
    failures.push({ gate: "source-binding", detail: "no source cited (content without provenance)" });
  }

  // 3. No out-of-corpus legal citation in the prose.
  const citationRe = /\b(?:section|sections|s\.?|ss\.?)\s?\d+[a-z]*\b|\b[A-Z][A-Za-z'’]+(?:\s+[A-Z][A-Za-z'’]+)*\s+Act\s+\d{4}\b/g;
  for (const m of text.match(citationRe) ?? []) {
    if (!blob.includes(norm(m)) && !inGivenOrTheirs(m)) {
      failures.push({
        gate: "no-out-of-corpus-citation",
        detail: `citation "${m.trim()}" is not grounded in the corpus entry`,
      });
    }
  }

  // 4. No fabricated/unsourced deadline. Every time figure in the prose must appear in
  //    the corpus entry's own grounded figures — otherwise it's an unsourced number.
  const grounded = groundedTimeFigures(entry);
  if (input.groundedText) collectFigures(input.groundedText, grounded);
  if (input.accountText) collectFigures(input.accountText, grounded);
  // Words as digits: "sixty days" is checked exactly as "60 days" is.
  for (const m of numberWordsToDigits(text).matchAll(TIME_FIGURE_RE)) {
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
  // Their words, reported in quotes, are not our advice (see `accountText`).
  const advice = checkNoAdvice(withoutReportedSpeech(withoutTheirQuotes(text, theirs), theirs));
  for (const h of advice.hits) {
    failures.push({ gate: "no-advice", detail: `${h.why}: "${h.match}"` });
  }

  // 6b. No ranking, no "satisfies an element".
  //
  // `checkNoScore` guards the two rules that matter most once the product talks about
  // grounds — never rank them ("strongest", "focus on", "likely to succeed"), and never say
  // a fact SATISFIES an element when it can only relate to one. It existed, with patterns
  // and tests, and had no caller anywhere in the app: the gate was written and never fitted.
  const score = checkNoScore(text);
  for (const h of score.hits) {
    failures.push({ gate: "no-score", detail: `${h.why}: "${h.match}"` });
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
