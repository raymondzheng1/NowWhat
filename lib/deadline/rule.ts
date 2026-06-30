import { isVerifyMarker, type DataPathway } from "@/lib/schemas/data";

/**
 * Time-limit NOTE for the procedural data layer.
 *
 * Product decision (2026-06-30, with legal sign-off): time limits are NOT a headline for
 * our users. We do not chase exact day-counts or show a prominent countdown. Instead we
 * state the GENERIC rule briefly and point to the relevant Act + free help, as one modest
 * line inside the analysis (never on the homepage, never a computed countdown).
 *
 * So this view always returns a short, safe rule (the entry's generic Act-referencing
 * text, or a generic fallback if an entry still holds a VERIFY placeholder) plus an
 * official source link when one is real.
 *
 * (Distinct from lib/deadline/compute.ts, which serves the legacy What Now? decode corpus.)
 */

export interface DeadlineRuleView {
  /** A brief, generic statement of the time-limit rule (names the relevant Act where known). */
  rule: string;
  /** Official source link, when real (null while a source is still a placeholder). */
  sourceUrl: string | null;
}

const GENERIC_RULE =
  "Most reviews have a strict time limit, set by the law for your decision. Check it with the official body or a free service.";

export function deadlineRuleView(e: DataPathway): DeadlineRuleView {
  return {
    rule: isVerifyMarker(e.deadlineRule) ? GENERIC_RULE : e.deadlineRule,
    sourceUrl: isVerifyMarker(e.sourceUrl) ? null : e.sourceUrl,
  };
}
