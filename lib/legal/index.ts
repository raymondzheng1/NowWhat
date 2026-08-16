import rawIndex from "@/corpus/legal/index.json";
import {
  LegalIndexSchema,
  type LegalIndex,
  type Ground,
  type Process,
  type Comparison,
  type ReviewKind,
} from "@/lib/schemas/legal";

/**
 * Loads + validates the committed LEGAL-SUBSTANCE corpus — the single source for the
 * "Learn" content (processes, comparison, grounds) rendered deterministically across the
 * library, the guided tour, and in-flow in the Rights Saver (TECHNICAL_SPEC §0). Until
 * the corpus is populated + signed off, grounds carry no leading cases so the v2 generator
 * can cite nothing (gated behaviour).
 */
let cached: LegalIndex | null = null;

export function getLegalCorpus(): LegalIndex {
  if (!cached) cached = LegalIndexSchema.parse(rawIndex);
  return cached;
}

// ---- Grounds ----

/**
 * PUBLICATION GATE. `status: seed` means "drafted, not yet confirmed by a supervising
 * lawyer" — but it gated nothing: every reader of the corpus returned seed grounds happily,
 * so a seed ground would have received a public URL, a sitemap entry, Article structured
 * data, and a tickable checkbox in the /start flow the moment it was built. The status field
 * was decorative.
 *
 * Display paths must go through these. Build scripts, linters and tests that deliberately
 * need everything pass `includeUnverified`.
 */
export function listGrounds(includeUnverified = false): Ground[] {
  const all = getLegalCorpus().grounds;
  return includeUnverified ? all : all.filter((g) => g.status === "verified");
}

/** Returns a seed ground only when explicitly asked — see listGrounds. */
export function getGround(id: string, includeUnverified = false): Ground | undefined {
  return listGrounds(includeUnverified).find((g) => g.id === id);
}

/** Grounds used in a given process (e.g. all judicial-review grounds). */
export function groundsForProcess(kind: ReviewKind, includeUnverified = false): Ground[] {
  return listGrounds(includeUnverified).filter((g) => g.usedIn.includes(kind));
}

/** True once a ground has at least one verified leading case (v2 readiness check). */
export function groundHasCitableAuthority(id: string): boolean {
  const g = getGround(id);
  return !!g && g.status === "verified" && g.leadingCases.length > 0;
}

// ---- Processes + comparison ----
export function listProcesses(): Process[] {
  return getLegalCorpus().processes;
}

export function getProcess(id: ReviewKind): Process | undefined {
  return getLegalCorpus().processes.find((p) => p.id === id);
}

export function getComparison(): Comparison {
  return getLegalCorpus().comparison;
}
