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
  /** Display names for the two forums, resolved from the legal corpus. The procedural data
   *  layer stores internal codes ("ADJR/FederalCourt", "SCV-O56") which must never reach a
   *  reader — including in the summary they hand to a legal service. */
  forumNames?: { merits?: string; judicial?: string };
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
    // Each path carries the question that forum decides, so the person (and the service
    // they hand this to) can see at a glance what each one is actually for.
    triage.avenue.mrAvailable
      ? `- Merits review: ${input.forumNames?.merits ?? triage.avenue.mrBody} — asks "Is this the correct or preferable decision?" (a tribunal can substitute a new decision)`
      : "- Merits review: may not be available",
    triage.avenue.jrAvailable
      ? `- Judicial review: ${input.forumNames?.judicial ?? triage.avenue.jrForum} — asks "Was the decision made lawfully?" (a court cannot substitute its own decision)`
      : "- Judicial review: may not be available",
  ];
  if (triage.avenue.noReviewEndpoint) lines.push(`- Note: ${triage.avenue.noReviewEndpoint}`);
  lines.push(
    "",
    "TIME LIMIT:",
    `- ${dl.rule}${dl.sourceUrl ? `  (source: ${dl.sourceUrl})` : ""}`,
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
