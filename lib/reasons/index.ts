import { isVerifyMarker, type DataPathway } from "@/lib/schemas/data";

/**
 * Request-reasons step (PRD §3 step 2) — DETERMINISTIC template + the CORRECTED clock
 * warning. A reasons request may extend a MERITS-review period only if the enabling Act
 * says so (from the data layer); it does NOT pause any JUDICIAL-review limitation period.
 * Information, not advice; no outcome claims.
 */

export interface ReasonsView {
  how: string;
  /** Statutory provision, only when real (VERIFY placeholders are hidden). */
  provision: string | null;
  extendsMR: boolean | string;
}

/** The single corrected clock warning, shown wherever reasons are discussed. */
export const REASONS_CLOCK_WARNING =
  "Asking for the reasons can help you understand the decision. Be careful with time limits, though: asking for reasons may extend the time limit for a tribunal (merits) review only if the law for your decision says so — do not assume it does. It does not pause the time limit for going to court (judicial review). To protect your right to go to court, act within the time limit even while you wait for the reasons.";

export function reasonsView(e: DataPathway): ReasonsView {
  const how = isVerifyMarker(e.reasonsRequest.how)
    ? "ask the decision-maker, in writing, for a statement of the reasons for the decision"
    : e.reasonsRequest.how;
  const provision = isVerifyMarker(e.reasonsRequest.provision) ? null : e.reasonsRequest.provision;
  return { how, provision, extendsMR: e.reasonsRequest.extendsMR };
}

export interface ReasonsTemplateInput {
  decisionMaker?: string;
  reference?: string;
  decisionDate?: string;
  about?: string;
}

/**
 * A plain-language draft the person can edit and send THEMSELVES (we never lodge it).
 * Square-bracket placeholders for anything personal; no advice, no outcome claims.
 */
export function reasonsRequestTemplate(e: DataPathway, input: ReasonsTemplateInput = {}): string {
  const to = input.decisionMaker?.trim() || "[the office or person who made the decision]";
  const ref = input.reference?.trim() || "[your reference number, if you have one]";
  const date = input.decisionDate?.trim() || "[the date on the decision]";
  const about = input.about?.trim() || "[what the decision was about]";
  const provision = reasonsView(e).provision;
  const basis = provision
    ? `Under ${provision}, I ask for`
    : "I ask for";

  return [
    `To ${to}`,
    "",
    `Re: ${ref}`,
    "",
    `I am writing about the decision dated ${date} about ${about}.`,
    "",
    `${basis} a written statement of the reasons for the decision. Please include the findings on the important questions of fact, and the evidence or material those findings were based on.`,
    "",
    "Please send the reasons to me in writing at the address/email below.",
    "",
    "[Your full name]",
    "[Your address or email]",
    "[Today's date]",
  ].join("\n");
}
