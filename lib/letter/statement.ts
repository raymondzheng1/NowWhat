import { CASE_CLOSING, CASE_SECTION, REASONS_BLANK } from "@/lib/draft/build";
import type { Bones } from "@/lib/letter/bones";

/**
 * The statement of case, assembled from work already done (the owner's ask, 2026-11-02: the
 * document should leverage the analysis, and be quicker).
 *
 * It used to be written by a second model call that started only once the analysis had
 * finished, and wrote every ground again from the beginning: 25 to 70 seconds after a 30-second
 * analysis. Now each ground's paragraph is written by the same call that argues that ground both
 * ways for the analysis, all grounds at once, and the decision, request and facts by one more
 * call alongside them. This puts those parts in the order the case document has always had,
 * inside the draft's own head and sign-off. Nothing here writes a word of prose.
 *
 * Every gate the written statement faces runs over what this returns, in the route.
 */
export type CasePath = "judicial-review" | "merits-review" | "internal-review";

export interface StatementParts {
  /** What was decided, by whom and when, then the reasons given. Empty keeps the blank. */
  decision: string;
  ask: string;
  facts: string;
  documents: string[];
  /** Each ground or reason with its heading and the paragraph argued for it, in order. */
  points: { heading: string; argument: string }[];
}

const ASK_HEADING: Record<CasePath, string> = {
  "judicial-review": CASE_SECTION.askCourt,
  "merits-review": CASE_SECTION.askTribunal,
  "internal-review": CASE_SECTION.askAgency,
};
const POINTS_HEADING: Record<CasePath, string> = {
  "judicial-review": CASE_SECTION.grounds,
  "merits-review": CASE_SECTION.whyChange,
  "internal-review": CASE_SECTION.whyReview,
};

/** The draft's opening line(s): everything in its body before the first section. */
function opening(bones: Bones): string {
  const at = bones.body.indexOf(CASE_SECTION.decision);
  return (at >= 0 ? bones.body.slice(0, at) : "").trim();
}

export function assembleStatement(bones: Bones, path: CasePath, parts: StatementParts): string {
  const label = path === "judicial-review" ? "Ground" : "Reason";
  const blocks = [
    opening(bones),
    `${CASE_SECTION.decision}\n${parts.decision.trim() || REASONS_BLANK}`,
    `${ASK_HEADING[path]}\n${parts.ask.trim()}`,
    `${CASE_SECTION.facts}\n${parts.facts.trim()}`,
    [POINTS_HEADING[path], ...parts.points.map((p, i) => `${label} ${i + 1}: ${p.heading}\n${p.argument.trim()}`)].join(
      "\n\n",
    ),
    parts.documents.length ? `Documents I rely on\n${parts.documents.map((d) => `- ${d.trim()}`).join("\n")}` : "",
    ...CASE_CLOSING[path],
  ].filter((b) => b.trim());
  return `${bones.head}\n\n${blocks.join("\n\n")}\n\n${bones.tail}`;
}
