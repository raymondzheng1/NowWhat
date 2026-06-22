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
export function classifyData(text: string, jurisdiction?: Jurisdiction): DataClassifyResult {
  const index = getDataIndex();
  const jur = new Map(index.entries.map((e) => [e.id, e.jurisdiction] as const));
  const hay = " " + text.toLowerCase().replace(/\s+/g, " ") + " ";

  const scores = new Map<string, { score: number; tokens: Set<string> }>();
  for (const t of index.classification) {
    if (jurisdiction && jur.get(t.entryId) !== jurisdiction) continue;
    if (hay.includes(" " + t.token)) {
      const cur = scores.get(t.entryId) ?? { score: 0, tokens: new Set<string>() };
      cur.score += KIND_WEIGHT[t.kind] ?? 1;
      cur.tokens.add(t.token);
      scores.set(t.entryId, cur);
    }
  }

  let best: { entryId: string; score: number; tokens: Set<string> } | null = null;
  for (const [entryId, v] of scores) {
    if (!best || v.score > best.score) best = { entryId, ...v };
  }

  if (best) return { entryId: best.entryId, isFallback: false, matched: [...best.tokens] };
  return { entryId: fallbackId(jurisdiction ?? "Vic"), isFallback: true, matched: [] };
}
