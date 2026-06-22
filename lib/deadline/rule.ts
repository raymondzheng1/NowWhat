import { dataIsConfirmable, isVerifyMarker, type DataPathway } from "@/lib/schemas/data";

/**
 * Deadline RULE view for the procedural data layer (PRD §5 — the safety contract).
 * NEVER a computed countdown. When the entry is verified + sourced + fresh we show the
 * lawyer-verified RULE with its verified-as-at date and official source. Otherwise the
 * staleness gate degrades: the UI shows a calm "we can't confirm this time limit right
 * now — act quickly, here's the source + free help" and NEVER a number.
 *
 * (Distinct from lib/deadline/compute.ts, which serves the legacy What Now? decode
 * corpus. This module is the BRD-compliant, no-countdown renderer for Review Builder.)
 */

export interface DeadlineRuleView {
  /** When true, render `rule` + `verifiedAsAt` + `sourceUrl`. */
  confirmable: boolean;
  /** The plain rule (only safe to show when confirmable — seeds carry VERIFY text). */
  rule: string | null;
  verifiedAsAt: string | null;
  sourceUrl: string | null;
}

export function deadlineRuleView(e: DataPathway): DeadlineRuleView {
  const confirmable = dataIsConfirmable(e);
  return {
    confirmable,
    // Only surface the rule text once verified — never leak a VERIFY placeholder.
    rule: confirmable && !isVerifyMarker(e.deadlineRule) ? e.deadlineRule : null,
    verifiedAsAt: confirmable ? e.verifiedAsAt : null,
    sourceUrl: confirmable ? e.sourceUrl : null,
  };
}
