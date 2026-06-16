import rawIndex from "@/corpus/index.json";
import { CorpusIndexSchema, type CorpusIndex, type PathwayEntry } from "@/lib/schemas/corpus";

/**
 * Loads and validates the committed corpus index — the ONLY source of legal substance
 * (TECHNICAL_SPEC §0). Parsed once with Zod so a malformed build is caught immediately.
 */

let cached: CorpusIndex | null = null;

export function getCorpus(): CorpusIndex {
  if (!cached) cached = CorpusIndexSchema.parse(rawIndex);
  return cached;
}

export function listEntries(): PathwayEntry[] {
  return getCorpus().entries;
}

export function getEntry(id: string): PathwayEntry | undefined {
  return getCorpus().entries.find((e) => e.id === id);
}

/** The generic Victorian fallback entry, if present. */
export const FALLBACK_ENTRY_ID = "vic-generic";

export interface ClassifyResult {
  entryId: string;
  score: number;
  matchedTokens: string[];
}

const KIND_WEIGHT: Record<string, number> = {
  issuer: 4,
  decisionType: 3,
  title: 2,
  keyword: 1,
};

/**
 * Classify free text (a letter or a question) to the best-matching corpus entry.
 * Returns null when nothing matches at all (caller routes to "not covered" / help).
 * Letter text is treated as DATA, never instructions (harness §6.5).
 */
export function classify(text: string): ClassifyResult | null {
  const hay = " " + text.toLowerCase().replace(/\s+/g, " ") + " ";
  const scores = new Map<string, { score: number; tokens: Set<string> }>();

  for (const t of getCorpus().classification) {
    // Word-ish boundary match to avoid spurious substring hits.
    if (hay.includes(" " + t.token + " ") || hay.includes(" " + t.token)) {
      const cur = scores.get(t.entryId) ?? { score: 0, tokens: new Set<string>() };
      cur.score += KIND_WEIGHT[t.kind] ?? 1;
      cur.tokens.add(t.token);
      scores.set(t.entryId, cur);
    }
  }

  if (scores.size === 0) return null;

  let best: ClassifyResult | null = null;
  for (const [entryId, v] of scores) {
    if (!best || v.score > best.score) {
      best = { entryId, score: v.score, matchedTokens: [...v.tokens] };
    }
  }
  return best;
}

/**
 * Classify with a soft fallback for decode: if nothing specific matches but a generic
 * entry exists, route there (so the person still gets the right-to-reasons + help),
 * flagged as a fallback so the UI is honest about uncertainty.
 */
export function classifyForDecode(text: string): {
  entryId: string;
  isFallback: boolean;
  matchedTokens: string[];
} | null {
  const best = classify(text);
  if (best && best.entryId !== FALLBACK_ENTRY_ID) {
    return { entryId: best.entryId, isFallback: false, matchedTokens: best.matchedTokens };
  }
  if (getEntry(FALLBACK_ENTRY_ID)) {
    return {
      entryId: FALLBACK_ENTRY_ID,
      isFallback: true,
      matchedTokens: best?.matchedTokens ?? [],
    };
  }
  return best ? { entryId: best.entryId, isFallback: false, matchedTokens: best.matchedTokens } : null;
}
