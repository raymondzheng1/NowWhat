import type { DataPathway, Jurisdiction } from "@/lib/schemas/data";

/**
 * Tripwire (PRD §3) — DETERMINISTIC stop-and-route. Flags are USER-DECLARED (checkboxes)
 * or structural (the privative-clause flag from the data layer), never inferred from the
 * user's free text.
 *
 * TWO TIERS (2026-08-16). Originally every flag produced a hard stop with no builder
 * output. In testing that made the service useless: the two most commonly-ticked boxes are
 * about TIMING ("my time limit is soon", "a hearing is booked"), which is the situation
 * almost everyone is in when they reach us — and stopping there left them with nothing at
 * all. Worse, a person told to hurry and given no information is less able to act, not more.
 *
 *   STOP   — out of scope or high harm. We genuinely cannot help safely, so we hand over
 *            to a person and show no builder output: child-protection / family /
 *            guardianship / compulsory mental-health DECISIONS, a criminal element,
 *            detention, migration, a privative clause, or a decision we cannot classify.
 *   URGENT — timing. We show a prominent "get help today" banner AND still show the review
 *            options, the reasons letter and the free-help list. Knowing the path is what
 *            makes a fast call to a service useful.
 *
 * `stop` therefore means "no builder output"; `urgent` means "lead with urgency, then help".
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

/** Reasons that are about timing, not scope — urgent, but we still help. */
export const URGENT_REASONS: readonly TripwireReason[] = [
  "deadline-imminent-or-passed",
  "hearing-on-foot",
] as const;

export interface TripwireFlags {
  /**
   * The DECISION is a child-protection, family-law, guardianship or compulsory
   * mental-health-treatment decision. Not simply that the person has a health condition or
   * children — a Centrelink, housing or fines decision stays in scope in that case, and is
   * exactly what this service is for.
   */
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
  /** True when there must be NO builder output — hand straight to a person. */
  stop: boolean;
  /** True when the matter is time-critical but we still show the guidance. */
  urgent: boolean;
  /** Every reason that fired, in flag order (stop reasons first). */
  reasons: TripwireReason[];
  /** Just the reasons that force a stop. */
  stopReasons: TripwireReason[];
  /** Just the timing reasons. */
  urgentReasons: TripwireReason[];
}

export function checkTripwire(input: TripwireInput): TripwireResult {
  const f = input.flags ?? {};
  const stopReasons: TripwireReason[] = [];
  const urgentReasons: TripwireReason[] = [];

  if (f.family) stopReasons.push("family-guardianship-mental-health");
  if (f.criminal) stopReasons.push("criminal");
  if (f.detention) stopReasons.push("detention");
  if (f.migration) stopReasons.push("migration");
  if (input.entry?.privativeClause) stopReasons.push("privative-clause");
  if (input.unclassifiable) stopReasons.push("unclassifiable");

  if (f.deadlineImminentOrPassed) urgentReasons.push("deadline-imminent-or-passed");
  if (f.hearingBooked) urgentReasons.push("hearing-on-foot");

  return {
    stop: stopReasons.length > 0,
    urgent: urgentReasons.length > 0,
    reasons: [...stopReasons, ...urgentReasons],
    stopReasons,
    urgentReasons,
  };
}

/** Plain-language explanation for each tripwire reason (shown on the route-out screen). */
export const TRIPWIRE_MESSAGES: Record<TripwireReason, string> = {
  "family-guardianship-mental-health":
    "Decisions about child protection, family law, guardianship or compulsory mental-health treatment are sensitive and have their own rules. A lawyer or community legal centre should help with these directly.",
  criminal:
    "Anything with a criminal element needs a lawyer. Please get legal help rather than using a self-help tool.",
  detention: "If someone is in detention, this needs urgent legal help, not a self-help tool.",
  migration:
    "Migration and visa decisions are outside what this tool covers. A registered migration agent or lawyer can help.",
  "hearing-on-foot":
    "A hearing is already booked or underway, so timing matters a lot. Talk to a free legal service today — your options below will help you explain the matter quickly.",
  "deadline-imminent-or-passed":
    "Your time limit is very soon or has passed, so please contact a free legal service today. Missing a limit does not always end things, and your options below will help you have that conversation.",
  "privative-clause":
    "This kind of decision has special rules that limit review. A lawyer should look at it directly.",
  unclassifiable:
    "We couldn't confidently work out the right path for this decision, so we won't guess. A free legal service can point you the right way.",
};
