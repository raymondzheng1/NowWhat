import rawIndex from "@/corpus/legal/index.json";
import {
  LegalIndexSchema,
  type LegalIndex,
  type Ground,
  type Process,
  type Comparison,
  type Concept,
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

// ---- Concepts (the mind-map structural nodes) ----

/**
 * Concepts are explanatory nodes, not grounds and not processes: the justiciability gate,
 * the two federal judicial-review routes, remedies, standing, and the two non-review
 * avenues. Unverified entries are withheld for the same reason grounds are — a half-checked
 * statement about which court can help you is worse than no statement.
 */
export function listConcepts(includeUnverified = false): Concept[] {
  const all = getLegalCorpus().concepts ?? [];
  return includeUnverified ? all : all.filter((c) => c.status === "verified");
}

export function getConcept(id: string, includeUnverified = false): Concept | undefined {
  return listConcepts(includeUnverified).find((c) => c.id === id);
}

/** Concepts that sit on a given route, scoped to where the person actually is. */
export function conceptsFor(
  route: "merits-review" | "judicial-review" | "complaint",
  jurisdiction?: "Vic" | "Cth",
): Concept[] {
  return listConcepts().filter(
    (c) =>
      (c.appliesTo.includes(route) || c.appliesTo.includes("any")) &&
      (c.jurisdictions.length === 0 || !jurisdiction || c.jurisdictions.includes(jurisdiction)),
  );
}
