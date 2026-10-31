import type { DataPathway } from "@/lib/schemas/data";

/**
 * Which decision a set of in-flow answers belongs to.
 *
 * Everything a person writes in /start is about ONE letter: their account of what happened,
 * the goals they tick, the notes under each point they mark. It is held per tab so that
 * following a link out to an explainer and pressing Back does not lose it — and it was held
 * under a single key with nothing in it to say what it was about. So changing the decision in
 * the same tab restored the PREVIOUS matter's answers into the new one: a fine analysed on an
 * account of a Centrelink debt, those words carried into the memo, and on to the model.
 *
 * Answers are now stored against the matter they were written for and restored only for it.
 * The owner's call, and the consequence is accepted: changing the decision starts from
 * scratch.
 *
 * The jurisdiction rides along with the id. Every data entry carries exactly one
 * jurisdiction today, so the id alone would do — but if an id were ever shared across the
 * two, a Victorian answer set would restore into a Commonwealth matter, and ruling that out
 * costs one string.
 */
export function matterKey(entry: Pick<DataPathway, "id" | "jurisdiction">): string {
  return `${entry.jurisdiction}|${entry.id}`;
}

/**
 * The stored answers, but only if they were written for this matter.
 *
 * Returns null — "nothing to restore" — for a blob belonging to another decision, a blob
 * written before matters were recorded (a tab left open across a deploy), and anything that
 * is not the object we wrote. The caller then starts the person fresh, which is the safe
 * direction in every one of those cases: the cost is re-typing, and the cost of the other
 * direction is an analysis of someone's fine built on their housing story.
 */
export function flowForMatter<T extends { matter?: unknown }>(
  raw: string | null | undefined,
  matter: string,
): T | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  // An absent matter is a mismatch, never a wildcard: a blob with no matter recorded could
  // have been written for any decision, so it may not be poured into this one.
  if ((parsed as { matter?: unknown }).matter !== matter) return null;
  return parsed as T;
}
