import rawIndex from "@/data/index.json";
import { DataIndexSchema, type DataIndex, type DataPathway, type Jurisdiction } from "@/lib/schemas/data";

/**
 * Loads + validates the committed PROCEDURAL data index — the lawyer-verified layer for
 * deadlines/forms/agencies/MR criteria (TECHNICAL_SPEC §0). Separate from the legal
 * corpus. Parsed once with Zod so a malformed build is caught immediately.
 */
let cached: DataIndex | null = null;

export function getDataIndex(): DataIndex {
  if (!cached) cached = DataIndexSchema.parse(rawIndex);
  return cached;
}

export function listDataEntries(): DataPathway[] {
  return getDataIndex().entries;
}

export function getDataEntry(id: string): DataPathway | undefined {
  return getDataIndex().entries.find((e) => e.id === id);
}

export function fallbackId(jurisdiction: Jurisdiction): string {
  return jurisdiction === "Cth" ? "cth-generic" : "vic-generic";
}

export function fallbackEntry(jurisdiction: Jurisdiction): DataPathway | undefined {
  return getDataEntry(fallbackId(jurisdiction));
}

const KIND_WEIGHT: Record<string, number> = {
  decisionMaker: 4,
  decisionType: 3,
  title: 2,
  keyword: 1,
};

export interface DataClassifyResult {
  entryId: string;
  isFallback: boolean;
  matched: string[];
}

/**
 * Classify free text (a decision description) to the best-matching procedural entry,
 * optionally restricted to a jurisdiction. Falls back to the generic per-jurisdiction
 * entry (so the person still gets reasons + help), flagged as a fallback so the UI is
 * honest about uncertainty. Text is treated as DATA, never instructions (harness §6.5).
 */
/**
 * Does `token` appear in `hay` as a whole word (or its plural)? `hay` is space-padded.
 * "fine" in "fines" yes; "fine" in "finest", "lease" in "leased" no.
 */
function hasWord(hay: string, token: string): boolean {
  const needle = " " + token;
  for (let i = hay.indexOf(needle); i !== -1; i = hay.indexOf(needle, i + 1)) {
    const after = hay.slice(i + needle.length, i + needle.length + 2);
    if (!/^[a-z]/.test(after) || /^s[^a-z]/.test(after)) return true;
  }
  return false;
}

type Scores = Map<string, { score: number; tokens: Set<string>; kinds: Map<string, string> }>;

/**
 * Score every entry against free text. Shared by `classifyData` and `suggestEntry`.
 * `wholeWords` is the suggestion's stricter matching; classification keeps its prefix match.
 */
function scoreText(text: string, jurisdiction?: Jurisdiction, wholeWords = false): Scores {
  const index = getDataIndex();
  const jur = new Map(index.entries.map((e) => [e.id, e.jurisdiction] as const));
  const hay = " " + text.toLowerCase().replace(/\s+/g, " ") + " ";

  const scores: Scores = new Map();
  for (const t of index.classification) {
    if (jurisdiction && jur.get(t.entryId) !== jurisdiction) continue;
    if (wholeWords ? hasWord(hay, t.token) : hay.includes(" " + t.token)) {
      const cur = scores.get(t.entryId) ?? { score: 0, tokens: new Set<string>(), kinds: new Map<string, string>() };
      cur.score += KIND_WEIGHT[t.kind] ?? 1;
      cur.tokens.add(t.token);
      cur.kinds.set(t.token, t.kind);
      scores.set(t.entryId, cur);
    }
  }
  return scores;
}

export function classifyData(text: string, jurisdiction?: Jurisdiction): DataClassifyResult {
  const scores = scoreText(text, jurisdiction);

  let best: { entryId: string; score: number; tokens: Set<string> } | null = null;
  for (const [entryId, v] of scores) {
    if (!best || v.score > best.score) best = { entryId, ...v };
  }

  if (best) return { entryId: best.entryId, isFallback: false, matched: [...best.tokens] };
  return { entryId: fallbackId(jurisdiction ?? "Vic"), isFallback: true, matched: [] };
}

/**
 * Does what the person WROTE clearly describe a different kind of decision from the one
 * they picked? If so, which one.
 *
 * Reported from the live site: someone picked "A Victorian government decision" and then
 * described, in detail, a parking infringement — "an infringement notice … issued by a
 * parking enforcement officer". The generic page gave them general steps, said an internal
 * review "may not apply", and said nothing about the things that matter for a fine: that it
 * can be taken to court, and that most options close once the fine is registered. The fines
 * page says all of that. The words that would have sent them there were already on the page.
 *
 * This only SUGGESTS — the person decides, and nothing moves without them. So it is built to
 * stay quiet unless the evidence is plain:
 *   · it speaks only to someone who chose a GENERAL page. A person who picked renting chose
 *     renting; a passing mention of a fine is not a reason to second-guess them;
 *   · the match must be a specific decision type, never a generic catch-all;
 *   · words match whole ("fine" is not "finest"), and the evidence must be about the
 *     DECISION, not just who made it: a body's name alone — "the local council", "Victoria
 *     Police" — names someone who makes many kinds of decision, so it never counts by itself.
 *     It needs two decision terms, one multi-word decision term ("infringement notice"), or a
 *     decision term together with the body's name;
 *   · it must outscore the decision type they picked on that same text;
 *   · and a match in the person's own jurisdiction wins over one in the other.
 * The end-to-end QA found it suggesting fines for "the local council refused my permit".
 * Runs on the device against the data index the page already holds. Nothing is sent.
 */
export function suggestEntry(
  text: string,
  chosenId: string,
): { entryId: string; matched: string[] } | null {
  if (!text.trim()) return null;
  const entries = getDataIndex().entries;
  const chosen = entries.find((e) => e.id === chosenId);
  if (!chosen?.isFallback) return null;
  const scores = scoreText(text, undefined, true);
  const fallback = new Set(entries.filter((e) => e.isFallback).map((e) => e.id));
  const jurOf = new Map(entries.map((e) => [e.id, e.jurisdiction] as const));
  const chosenScore = scores.get(chosenId)?.score ?? 0;

  const qualifies = (v: { score: number; tokens: Set<string>; kinds: Map<string, string> }) => {
    const about = [...v.tokens].filter((tok) => v.kinds.get(tok) !== "decisionMaker");
    const byWho = v.tokens.size - about.length;
    const strong = about.length >= 2 || about.some((tok) => tok.includes(" ")) || (about.length >= 1 && byWho >= 1);
    return strong && v.score > chosenScore;
  };

  let best: { entryId: string; score: number; tokens: Set<string>; same: boolean } | null = null;
  for (const [entryId, v] of scores) {
    if (fallback.has(entryId) || entryId === chosenId || !qualifies(v)) continue;
    const same = jurOf.get(entryId) === chosen.jurisdiction;
    // Same jurisdiction first; then the higher score.
    if (!best || (same && !best.same) || (same === best.same && v.score > best.score)) {
      best = { entryId, score: v.score, tokens: v.tokens, same };
    }
  }
  return best ? { entryId: best.entryId, matched: [...best.tokens] } : null;
}
