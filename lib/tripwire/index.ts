import type { DataPathway, Jurisdiction } from "@/lib/schemas/data";

/**
 * Tripwire (PRD §3) — DETERMINISTIC stop-and-route. For high-harm or out-of-scope cases
 * the builder STOPS (no avenue/template output) and routes the person straight to a
 * lawyer/CLC. Flags are USER-DECLARED (checkboxes) or structural (the privative-clause
 * flag from the data layer), never inferred from the user's free text.
 */

export type TripwireReason =
  | "family-guardianship-mental-health"
  | "criminal"
  | "detention"
  | "migration"
  | "hearing-on-foot"
  | "deadline-imminent-or-passed"
  | "privative-clause"
  | "unclassifiable";

export interface TripwireFlags {
  /** Child-protection / family / guardianship / mental-health decisions. */
  family?: boolean;
  criminal?: boolean;
  detention?: boolean;
  /** Migration is out of scope entirely (privative clauses). */
  migration?: boolean;
  /** A hearing is already booked / on foot. */
  hearingBooked?: boolean;
  /** The person says the time limit is very soon or has already passed. */
  deadlineImminentOrPassed?: boolean;
}

export interface TripwireInput {
  jurisdiction: Jurisdiction;
  flags: TripwireFlags;
  entry?: Pick<DataPathway, "privativeClause"> | null;
  /** The triage couldn't confidently classify the decision. */
  unclassifiable?: boolean;
}

export interface TripwireResult {
  stop: boolean;
  reasons: TripwireReason[];
}

export function checkTripwire(input: TripwireInput): TripwireResult {
  const reasons: TripwireReason[] = [];
  const f = input.flags ?? {};
  if (f.family) reasons.push("family-guardianship-mental-health");
  if (f.criminal) reasons.push("criminal");
  if (f.detention) reasons.push("detention");
  if (f.migration) reasons.push("migration");
  if (f.hearingBooked) reasons.push("hearing-on-foot");
  if (f.deadlineImminentOrPassed) reasons.push("deadline-imminent-or-passed");
  if (input.entry?.privativeClause) reasons.push("privative-clause");
  if (input.unclassifiable) reasons.push("unclassifiable");
  return { stop: reasons.length > 0, reasons };
}

/** Plain-language explanation for each tripwire reason (shown on the route-out screen). */
export const TRIPWIRE_MESSAGES: Record<TripwireReason, string> = {
  "family-guardianship-mental-health":
    "Decisions about child protection, family, guardianship or mental health are sensitive and have their own rules. A lawyer or community legal centre should help with these directly.",
  criminal:
    "Anything with a criminal element needs a lawyer. Please get legal help rather than using a self-help tool.",
  detention: "If someone is in detention, this needs urgent legal help, not a self-help tool.",
  migration: "Migration and visa decisions are outside what this tool covers. A registered migration agent or lawyer can help.",
  "hearing-on-foot":
    "If a hearing is already booked or underway, the timing matters a lot — talk to a lawyer or community legal centre now.",
  "deadline-imminent-or-passed":
    "If your time limit is very soon or has passed, don't wait — contact a free legal service today. Missing a limit doesn't always end things, but acting fast matters.",
  "privative-clause": "This kind of decision has special rules that limit review. A lawyer should look at it directly.",
  unclassifiable:
    "We couldn't confidently work out the right path for this decision, so we won't guess. A free legal service can point you the right way.",
};
