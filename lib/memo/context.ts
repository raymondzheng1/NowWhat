import type { DataPathway } from "@/lib/schemas/data";
import type { Concept, Ground, Process } from "@/lib/schemas/legal";

/**
 * The allow-list, as a string.
 *
 * This is the ONLY material the memo drafter is given, and the rule it enforces is the
 * owner's: the analysis and every legal source must come from our own knowledge base and
 * nowhere else. Whatever is not in here cannot be written, because the model never sees it
 * — and if it invents something anyway, `verifyOutput` has the same list to check against.
 *
 * Deliberately NOT in here: anything about the person. Their words are passed separately, as
 * data to work with, so the prompt keeps a hard line between "facts you may rely on" and
 * "what this person told us". The corpus half is also identical for everyone with the same
 * kind of decision, which is what makes it cacheable.
 */
export function buildMemoContext(input: {
  entry: DataPathway;
  process: Process | null;
  internal: Concept | null;
  grounds: Ground[];
  criteria: string[];
  forum: string;
  pathName: string;
}): string {
  const { entry, process: proc, internal, grounds, criteria, forum, pathName } = input;
  const L: string[] = [];

  L.push("DECISION TYPE:", entry.title, "");
  L.push("THE PATH THIS MEMO WORKS THROUGH:", `${pathName}, at ${forum}`, "");

  L.push("TIME LIMIT RULE (quote or paraphrase only — never add a number):");
  L.push(entry.deadlineRule, "");

  if (proc) {
    L.push(`WHAT THIS BODY IS ASKING: ${proc.question}`);
    L.push("WHO MAY APPLY:");
    for (const c of proc.canApply) L.push(`  - ${c}`);
    L.push("WHAT IT CAN DO:");
    for (const r of proc.remedies) L.push(`  - ${r}`);
    if (proc.limits.length) {
      L.push("WHAT IT CANNOT DO:");
      for (const r of proc.limits) L.push(`  - ${r}`);
    }
    L.push("");
  }

  if (internal) {
    L.push("WHAT AN INTERNAL REVIEW IS:", internal.whatItMeans);
    L.push("WHAT IT IS NOT:", internal.whatItIsNot ?? "");
    L.push("KEY POINTS:");
    for (const k of internal.keyPoints) L.push(`  - ${k}`);
    L.push("");
  }

  if (criteria.length) {
    L.push("WHAT THIS BODY DECIDES FOR THIS KIND OF DECISION:");
    for (const c of criteria) L.push(`  - ${c}`);
    L.push("");
  }

  if (grounds.length) {
    L.push("THE POINTS THE PERSON MARKED. For each, the TEST is the law and must not be");
    L.push("restated, softened or extended. Cases are named here and nowhere else.");
    for (const g of grounds) {
      L.push("", `GROUND: ${g.name} — ${g.plainName}`);
      L.push(`  question: ${g.oneLine}`);
      L.push(`  test: ${g.test}`);
      if (g.whatRelates.length) {
        L.push("  what tends to relate to it:");
        for (const w of g.whatRelates) L.push(`    - ${w}`);
      }
      if (g.leadingCases.length) {
        L.push("  cases:");
        for (const c of g.leadingCases) {
          L.push(`    - ${c.name}${c.pinpoint ? ` (${c.pinpoint})` : ""}${c.explains ? ` — ${c.explains}` : ""}`);
        }
      }
      if (g.whatItIsNot) L.push(`  what the other side will say: ${g.whatItIsNot}`);
    }
    L.push("");
  }

  L.push("SOURCES (copy these VERBATIM into the sources field — do not shorten or reword):");
  L.push(`  - ${entry.sourceUrl}`);
  if (proc) for (const s of proc.sources ?? []) L.push(`  - ${s}`);
  if (internal) for (const s of internal.sources ?? []) L.push(`  - ${s}`);
  for (const g of grounds) for (const s of g.sources ?? []) L.push(`  - ${s}`);

  return L.join("\n");
}

/**
 * Every source string the output is entitled to lean on, for the verifier's allow-list.
 * Built from the same objects as the context above, so the two cannot drift.
 */
export function memoExtraSources(input: {
  entry: DataPathway;
  process: Process | null;
  internal: Concept | null;
  grounds: Ground[];
}): string[] {
  const { entry, process: proc, internal, grounds } = input;
  return [
    entry.sourceUrl,
    entry.avenue.ir?.source ?? "",
    entry.avenue.mr.source,
    entry.avenue.jr.source,
    entry.reasonsRequest.provision,
    ...(proc?.sources ?? []),
    ...(internal?.sources ?? []),
    ...grounds.flatMap((g) => g.sources ?? []),
    ...grounds.flatMap((g) => g.leadingCases.map((c) => c.name)),
  ].filter(Boolean);
}
