import { getConcept, getGround, getProcess } from "@/lib/legal";
import type { DataPathway } from "@/lib/schemas/data";
import type { RulePath } from "@/lib/deadline/rule";
import { buildMemoContext, memoExtraSources } from "@/lib/memo/context";

/**
 * The corpus material for one path of one decision — shared by the analysis and the letter,
 * so the letter argues from exactly the law the analysis set out, and from nothing else.
 */
export function contextForPath(
  entry: DataPathway,
  input: { pathId: RulePath; groundIds: string[]; criteria: string[]; forum: string; pathName: string },
) {
  // ONLY A PATH THAT IS ONE OF THE TWO CORPUS PROCESSES GETS ONE.
  //
  // Stated positively on purpose. Written the other way round — "everything that is not an
  // internal review is merits review" — it handed the merits process to a court election,
  // and the model would then have been told that the body asks "Is this the correct or
  // preferable decision?" and can set the decision aside and substitute its own. A court
  // hearing a charge on election does neither. That mis-label has been patched on the card,
  // in the plan, in the hand-off and in the memo heading; this is the last place it could
  // still have entered, and it enters as the one thing a gate cannot catch, because the
  // sentence would be true of some other body.
  //
  // And only a TRIBUNAL on the merits path. The merits process — "stands in the shoes",
  // "correct or preferable", set aside and substitute — is a tribunal's, and the full notes
  // have long withheld it from any other body. The model was still handed it for the Housing
  // Appeals Office and for a renting dispute, so the analysis said what the full notes refused
  // to (the end-to-end QA).
  const meritsIsTribunal = (entry.avenue.mr.character ?? "tribunal") === "tribunal";
  const proc =
    input.pathId === "judicial-review"
      ? getProcess("judicial-review") ?? null
      : input.pathId === "merits-review" && meritsIsTribunal
        ? getProcess("merits-review") ?? null
        : null;
  const internal = input.pathId === "internal-review" ? getConcept("internal-review") ?? null : null;
  // Grounds of review belong to judicial review; carrying them elsewhere would invite an
  // application written against the wrong test.
  const grounds =
    input.pathId === "judicial-review"
      ? input.groundIds.map((id) => getGround(id)).filter((g): g is NonNullable<typeof g> => !!g)
      : [];

  const context = buildMemoContext({
    entry,
    process: proc,
    internal,
    grounds,
    criteria: input.criteria,
    forum: input.forum || entry.title,
    pathName: input.pathName || "review",
    pathId: input.pathId,
  });
  return { context, extraSources: memoExtraSources({ entry, process: proc, internal, grounds }), proc, internal, grounds };
}
