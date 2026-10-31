import type { DataPathway } from "@/lib/schemas/data";
import { ruleForPath, type RulePath } from "@/lib/deadline/rule";
import { answerableCriteria, withCriterionIds } from "@/lib/memo/criteria";
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
  /** The path being worked through — only its part of the time rule is shown. */
  pathId?: RulePath;
}): string {
  const { entry, process: proc, internal, grounds, criteria, forum, pathName } = input;
  const L: string[] = [];

  L.push("DECISION TYPE:", entry.title, "");
  L.push("THE PATH THIS MEMO WORKS THROUGH:", `${pathName}, at ${forum}`, "");

  // The page prints this rule, verbatim, above the analysis. Labelled "quote or paraphrase",
  // it invited the model to restate it — and a restated figure is the one thing the analysis
  // must never carry in its own words.
  L.push("TIME LIMIT (the page shows this to them separately — do NOT repeat it or any number in it):");
  L.push(ruleForPath(entry.deadlineRule, input.pathId), "");

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
    // THE CRITERIA, WITH THEIR IDS — the same move the grounds' elements needed.
    //
    // These lines were handed over as prose and nothing came back about them, because there
    // was no way to say which line an answer belonged to. The ids come from the criteria's
    // own words, and the routing lines ("these are two different paths") are listed without
    // one: there is nothing in anyone's account that speaks to which path applies, and
    // asking for it invites an answer about a line that has no answer.
    const answerable = withCriterionIds(answerableCriteria(entry, criteria));
    const orientation = criteria.filter((c) => !answerable.some((a) => a.text === c));
    if (answerable.length) {
      L.push("WHAT THIS BODY DECIDES FOR THIS KIND OF DECISION");
      L.push("(one entry per line in your answer, id copied exactly):");
      for (const c of answerable) L.push(`  - id: ${c.id} | ${c.text}`);
    }
    if (orientation.length) {
      L.push("HOW THE PATHS FIT TOGETHER (context only — write nothing against these):");
      for (const c of orientation) L.push(`  - ${c}`);
    }
    L.push("");
  }

  if (grounds.length) {
    L.push("THE POINTS THE PERSON MARKED. For each, the TEST is the law and must not be");
    L.push("restated, softened or extended. Cases are named here and nowhere else.");
    for (const g of grounds) {
      // THE ID, FIRST. It was never in here, and the shape the model returns is keyed by it,
      // so the model had to guess the id from the name — and for "Procedural fairness — the
      // hearing rule" it guessed `procedural-fairness-hearing-rule`, one word off. An id
      // that matches no ground matches nothing in the composer, so the whole drafted
      // application for the point was dropped without a trace: no error, no gate, just a
      // memo that quietly contained none of the work. Verified against the live site.
      L.push("", `GROUND (use this exact id: ${g.id}): ${g.name} — ${g.plainName}`);
      L.push(`  question: ${g.oneLine}`);
      L.push(`  test: ${g.test}`);
      // THE PARTS OF THE TEST, with their ids.
      //
      // The context named the test and stopped, so the only application a model could write
      // was one about the ground as a whole — which is the half of the work a lay reader can
      // already do. The parts have been in the corpus since it was written; handing them over
      // with their ids is what lets the draft answer each one separately, and lets the memo
      // put the answer back under the part it belongs to. An id that is not in this list
      // matches nothing on the way back and is dropped.
      if (g.elements.length) {
        L.push("  the parts that have to be shown (one entry per part, id copied exactly):");
        for (const el of g.elements) {
          L.push(`    - id: ${el.id} | ${el.name}`);
          if (el.layPrompt) L.push(`        asks: ${el.layPrompt}`);
        }
      }
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
  // The court avenue's own source. On a court-election memo there is no process and no
  // concept, so without this the only source offered is the scheme's front door — and the
  // source that actually says the election exists was both absent from the context and
  // missing from the allow-list below, so citing it would have been refused.
  if (entry.avenue.court?.source) L.push(`  - ${entry.avenue.court.source}`);
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
    entry.avenue.court?.source ?? "",
    entry.avenue.jr.source,
    entry.reasonsRequest.provision,
    ...(proc?.sources ?? []),
    ...(internal?.sources ?? []),
    ...grounds.flatMap((g) => g.sources ?? []),
    ...grounds.flatMap((g) => g.leadingCases.map((c) => c.name)),
  ].filter(Boolean);
}
