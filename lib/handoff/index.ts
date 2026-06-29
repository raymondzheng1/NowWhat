import type { TriageResult } from "@/lib/triage";
import { deadlineRuleView } from "@/lib/deadline/rule";

/**
 * Hand-off pack (PRD §3 step 9) — a structured, plain-language matter summary the person
 * can take to a community legal centre or lawyer. Built IN MEMORY for download/print;
 * nothing is stored or logged. Contains only what the person chose to provide.
 */

export interface HandoffInput {
  triage: TriageResult;
  decisionAbout?: string;
  decisionDate?: string;
  /** What the person wants (a different outcome / the decision set aside / not sure). */
  wants?: string;
  /** Whether they've asked for reasons yet. */
  reasonsRequested?: boolean;
  /** Grounds the person marked as possibly relating to their situation (their own view,
   *  neutral — points to discuss with a lawyer, NOT conclusions that a ground is made out). */
  relatedGrounds?: string[];
  note?: string;
}

export function buildHandoff(input: HandoffInput): string {
  const { triage } = input;
  const e = triage.entry;
  const dl = deadlineRuleView(e);
  const dash = (v?: string) => (v && v.trim() ? v.trim() : "—");

  const lines: string[] = [
    "MATTER SUMMARY",
    "(Prepared by the person seeking help, using a free self-help tool. General information only — not legal advice.)",
    "",
    `Jurisdiction: ${triage.jurisdiction === "Cth" ? "Commonwealth" : "Victoria"}`,
    `Type of decision: ${dash(input.decisionAbout)} (${e.title})`,
    `Date of decision: ${dash(input.decisionDate)}`,
    "",
    "POSSIBLE REVIEW PATH (to confirm with a lawyer):",
    triage.avenue.mrAvailable ? `- Merits review: ${triage.avenue.mrBody}` : "- Merits review: may not be available",
    triage.avenue.jrAvailable ? `- Judicial review: ${triage.avenue.jrForum}` : "- Judicial review: may not be available",
  ];
  if (triage.avenue.noReviewEndpoint) lines.push(`- Note: ${triage.avenue.noReviewEndpoint}`);
  lines.push(
    "",
    "TIME LIMIT:",
    dl.confirmable && dl.rule
      ? `- ${dl.rule}  (verified ${dl.verifiedAsAt}; source: ${dl.sourceUrl})`
      : "- Not confirmed by the tool — a time limit very likely applies and may be short. Confirm against the official source urgently.",
    "",
    `Reasons requested yet: ${input.reasonsRequested ? "yes" : "not yet"}`,
    `What the person wants: ${dash(input.wants)}`,
    `Their note: ${dash(input.note)}`,
  );
  if (input.relatedGrounds && input.relatedGrounds.length > 0) {
    lines.push(
      "",
      "GROUNDS THAT MIGHT RELATE (the person's own selection — points to discuss, NOT conclusions that any ground is made out):",
      ...input.relatedGrounds.map((g) => `- ${g}`),
    );
  }
  lines.push(
    "",
    "This summary was generated locally and is not stored anywhere.",
  );
  return lines.join("\n");
}
