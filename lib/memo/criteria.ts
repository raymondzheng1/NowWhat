import type { DataPathway } from "@/lib/schemas/data";

/**
 * The criteria a body actually decides by, with an id each, so the analysis can be written
 * one criterion at a time.
 *
 * The grounds of review have carried `elements` since the corpus was written, and the memo
 * now walks them part by part. Everywhere else — merits review, internal review, a court
 * election — there are no grounds: what the body decides is the lawyer-supplied criteria for
 * that scheme, and the memo listed them and stopped. So the person reading an internal-review
 * memo got the list and none of the work, which is the half they cannot do for themselves.
 *
 * These lists are plain strings in the data layer and carry no ids, so the ids are derived
 * here — from the TEXT, never from the position. Position would be the cheaper derivation and
 * it is the dangerous one: the context and the memo build their lists separately, and a list
 * that differed by one line would silently file every answer under the wrong criterion. A
 * text-derived id that does not match simply finds nothing, which is the failure we want.
 */
export interface IdentifiedCriterion {
  id: string;
  text: string;
}

/** Longest id we will build. Long enough to stay distinct, short enough to copy exactly. */
const ID_MAX = 48;

/**
 * Is this line orientation rather than a criterion?
 *
 * Some lines in these lists say what the body decides, and someone can say what happened on
 * that. Others say which path applies — "these are two different paths, and which one applies
 * depends on the decision" — and there is nothing in anyone's account that speaks to it.
 *
 * The data already marks them, without a field for it: a routing line is the one that appears
 * in BOTH the internal-review and merits-review lists, because appearing in both is exactly
 * what makes it a routing line. This is the same predicate the points step uses to decide
 * where to put a text box, deliberately reused rather than restated — two rules for one
 * question is how the step and the memo come to disagree about what a person was asked.
 */
export function isOrientation(entry: Pick<DataPathway, "irCriteria" | "mrCriteria">, c: string): boolean {
  return (entry.irCriteria ?? []).includes(c) && (entry.mrCriteria ?? []).includes(c);
}

/**
 * The criteria worth writing against: the list minus its routing lines.
 *
 * The orientation lines stay in the memo — they tell the reader which path is which — they
 * just get no id, so nothing can be drafted against them and the model is never asked to
 * find facts about a line that has none.
 */
export function answerableCriteria(
  entry: Pick<DataPathway, "irCriteria" | "mrCriteria">,
  criteria: string[],
): string[] {
  return criteria.filter((c) => !isOrientation(entry, c));
}

/**
 * Give each criterion an id taken from its own words.
 *
 * Readable on purpose: the model has to copy it back exactly, and `c-the-reviewing-agency`
 * is easier to copy than a hash while still being derived from the text rather than chosen.
 * Identical lines — which should not happen, but a list is data and data repeats — are
 * separated by a counter so no two ids collide within one list.
 */
export function withCriterionIds(criteria: string[]): IdentifiedCriterion[] {
  const seen = new Map<string, number>();
  return criteria.map((text) => {
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .split(" ")
      .filter(Boolean)
      .slice(0, 6);
    let id = "c";
    for (const w of words) {
      if (`${id}-${w}`.length > ID_MAX) break;
      id = `${id}-${w}`;
    }
    // A line with no letters or digits in it at all. Nothing to build from, so it gets a
    // bare prefix and the counter below keeps it unique.
    if (id === "c") id = "c-criterion";
    const n = (seen.get(id) ?? 0) + 1;
    seen.set(id, n);
    return { id: n === 1 ? id : `${id}-${n}`, text };
  });
}
