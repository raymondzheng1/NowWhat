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

/**
 * PUBLICATION GATE. `status: seed` means drafted but not confirmed by a human, and it gated
 * nothing here — a seed entry would have been served to /ask and /decode the moment it built,
 * exactly as a seed ground would have received a public URL. Display paths go through this;
 * build scripts and tests pass includeUnverified.
 */
export function listEntries(includeUnverified = false): PathwayEntry[] {
  const all = getCorpus().entries;
  return includeUnverified ? all : all.filter((e) => e.status === "verified");
}

export function getEntry(id: string, includeUnverified = false): PathwayEntry | undefined {
  return listEntries(includeUnverified).find((e) => e.id === id);
}

/**
 * The catch-all entries, one per jurisdiction.
 *
 * There used to be a single one, "vic-generic" — so a Commonwealth letter that matched no
 * specific guide fell back to a VICTORIAN entry and was told about VCAT. Adding a
 * Commonwealth catch-all achieves nothing unless the fallback is chosen by jurisdiction too.
 */
export const FALLBACK_BY_JURISDICTION = { Vic: "vic-generic", Cth: "cth-generic" } as const;

/** Kept for callers that just want "the" generic entry; prefer fallbackFor(). */
export const FALLBACK_ENTRY_ID = "vic-generic";

/**
 * Which government wrote this? Used only to pick the right catch-all.
 *
 * Bare "victoria" is DELIBERATELY not a Victorian marker: it appears in the postal address
 * of Commonwealth letters sent to Victorian residents, which would misroute the very people
 * this is meant to help. Markers are the bodies and instruments themselves.
 */
const CTH_MARKERS = [
  "services australia", "centrelink", "medicare", "australian taxation office", "the ato",
  "ndia", "ndis", "department of veterans", "home affairs", "child support",
  "commonwealth ombudsman", "administrative review tribunal", "commonwealth of australia",
  "australian government",
];
const VIC_MARKERS = [
  "vcat", "victorian civil and administrative", "fines victoria", "consumer affairs victoria",
  "director of housing", "department of families, fairness and housing", "victorian ombudsman",
  "supreme court of victoria", "state of victoria", "victorian government",
];

export function guessJurisdiction(text: string): "Cth" | "Vic" | null {
  const hay = ` ${text.toLowerCase().replace(/\s+/g, " ")} `;
  const cth = CTH_MARKERS.filter((m) => hay.includes(m)).length;
  const vic = VIC_MARKERS.filter((m) => hay.includes(m)).length;
  if (cth > vic) return "Cth";
  if (vic > cth) return "Vic";
  return null;
}

/** The catch-all for a jurisdiction, or the Victorian one when we cannot tell. */
export function fallbackFor(j: "Cth" | "Vic" | null): PathwayEntry | undefined {
  const id = j ? FALLBACK_BY_JURISDICTION[j] : FALLBACK_ENTRY_ID;
  return getEntry(id) ?? getEntry(FALLBACK_ENTRY_ID);
}

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
  const fallbackIds: string[] = Object.values(FALLBACK_BY_JURISDICTION);
  if (best && !fallbackIds.includes(best.entryId)) {
    return { entryId: best.entryId, isFallback: false, matchedTokens: best.matchedTokens };
  }
  // Route to the catch-all for the government that actually wrote the letter.
  const fb = fallbackFor(guessJurisdiction(text));
  if (fb) {
    return { entryId: fb.id, isFallback: true, matchedTokens: best?.matchedTokens ?? [] };
  }
  return best ? { entryId: best.entryId, isFallback: false, matchedTokens: best.matchedTokens } : null;
}
