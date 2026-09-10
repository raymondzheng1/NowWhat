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
  /** Display names for the forums, resolved from the legal corpus. The procedural data
   *  layer stores internal codes ("ADJR/FederalCourt", "SCV-O56") which must never reach a
   *  reader — including in the summary they hand to a legal service. */
  forumNames?: { internal?: string; merits?: string; judicial?: string };
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
    //
    // Internal review is listed FIRST and carries no question, because it is not one of the
    // two processes in the corpus and nothing confirms what a departmental reviewer decides
    // or can do. Until 2026-09-10 it had no line here at all: it lived inside the
    // merits-review body string ("internal review by Services Australia, then the ART"), so
    // splitting it into its own path silently dropped it from the one document a person
    // actually hands to a duty lawyer — the free first step, missing from the summary.
    ...(triage.avenue.irAvailable && triage.avenue.irBody
      ? [`- Internal review: ${input.forumNames?.internal ?? triage.avenue.irBody} — asking the decision-maker to look at its own decision again (usually free; what the reviewer can do differs by department)`]
      : []),
    // The tribunal's question and remedy are stated ONLY where the body actually is a
    // tribunal. The result card stopped attributing them to a non-tribunal on 2026-08-23,
    // but this document kept doing it: for a Victorian fine the merits field is now the
    // Magistrates' Court on election, and a court hearing the charge is not asking whether
    // the decision was correct or preferable, and cannot substitute an administrative
    // decision. A duty lawyer would spot it; the person handing it over would not.
    triage.avenue.mrAvailable
      ? (triage.avenue.mrCharacter ?? "tribunal") === "tribunal"
        ? `- Merits review: ${input.forumNames?.merits ?? triage.avenue.mrBody} — asks "Is this the correct or preferable decision?" (a tribunal can substitute a new decision)`
        : `- Review by another body: ${input.forumNames?.merits ?? triage.avenue.mrBody} — not a tribunal exercising merits review, so what it decides and what it can do need checking`
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
