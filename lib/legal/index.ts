import rawIndex from "@/corpus/legal/index.json";
import { LegalIndexSchema, type LegalIndex, type Ground } from "@/lib/schemas/legal";

/**
 * Loads + validates the committed LEGAL-SUBSTANCE corpus (grounds + triage) — the only
 * source of legal substance + citations (TECHNICAL_SPEC §0). Used by the v2 Learn /
 * elements / cases steps; until the corpus is populated + signed off, grounds carry no
 * leading cases so the generator can cite nothing (gated behaviour).
 */
let cached: LegalIndex | null = null;

export function getLegalCorpus(): LegalIndex {
  if (!cached) cached = LegalIndexSchema.parse(rawIndex);
  return cached;
}

export function listGrounds(): Ground[] {
  return getLegalCorpus().grounds;
}

export function getGround(id: string): Ground | undefined {
  return getLegalCorpus().grounds.find((g) => g.id === id);
}

/** True once a ground has at least one verified leading case (v2 readiness check). */
export function groundHasCitableAuthority(id: string): boolean {
  const g = getGround(id);
  return !!g && g.status === "verified" && g.leadingCases.length > 0;
}
