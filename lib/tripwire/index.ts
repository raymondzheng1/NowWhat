import type { DataPathway, Jurisdiction } from "@/lib/schemas/data";
import type { HelpService } from "@/lib/schemas/corpus";

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
  | "privative-clause";

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

/**
 * i18n key per tripwire reason.
 *
 * These strings used to live here as literals. They are customer prose AND they are
 * interpolated into a document the person hands to a legal service — but
 * `scripts/lib/copy-surfaces.mjs` never opens `lib/*.ts`, so the no-advice, no-AI-mention
 * and reading-level linters could not see a word of them. They now live under
 * `rights.tripwire.*` where the gates apply.
 */
export const TRIPWIRE_MESSAGE_KEYS: Record<TripwireReason, string> = {
  "family-guardianship-mental-health": "tripwire.familyGuardianshipMentalHealth",
  criminal: "tripwire.criminal",
  detention: "tripwire.detention",
  migration: "tripwire.migration",
  "hearing-on-foot": "tripwire.hearingOnFoot",
  "deadline-imminent-or-passed": "tripwire.deadlineImminentOrPassed",
  "privative-clause": "tripwire.privativeClause",
};

/**
 * Who to call, per STOP reason.
 *
 * The stop screen is the highest-stakes surface in the product: we have just told someone
 * this tool cannot help them, so the next thing they read has to be the right person to
 * ring. It used to show the services for the DECISION AREA — tick "there is a criminal
 * matter" on a fine and you were handed Fines Victoria — which answers a question nobody
 * asked. These are matched to the reason we stopped.
 *
 * Every entry is an existing free service with its published contact details; nothing here
 * asserts anything about the law.
 */
export const TRIPWIRE_SERVICES: Record<TripwireReason, HelpService[]> = {
  "family-guardianship-mental-health": [
    {
      service: "Victoria Legal Aid",
      who: "free legal help with family, child protection and mental-health matters — Legal Help line",
      phone: "1300 792 387",
      link: "https://www.legalaid.vic.gov.au",
    },
    {
      service: "Victorian Aboriginal Legal Service (VALS)",
      who: "free legal help for Aboriginal and Torres Strait Islander people",
      phone: "1800 064 865",
      link: "https://www.vals.org.au",
    },
    {
      service: "Community legal centres",
      who: "free local legal help — find your nearest centre",
      link: "https://www.fclc.org.au",
    },
  ],
  criminal: [
    {
      service: "Victoria Legal Aid",
      who: "free legal help and duty lawyers for criminal matters — Legal Help line",
      phone: "1300 792 387",
      link: "https://www.legalaid.vic.gov.au",
    },
    {
      service: "Victorian Aboriginal Legal Service (VALS)",
      who: "free legal help for Aboriginal and Torres Strait Islander people",
      phone: "1800 064 865",
      link: "https://www.vals.org.au",
    },
  ],
  detention: [
    {
      service: "Victoria Legal Aid",
      who: "free legal help — Legal Help line",
      phone: "1300 792 387",
      link: "https://www.legalaid.vic.gov.au",
    },
    {
      service: "Victorian Aboriginal Legal Service (VALS)",
      who: "free legal help for Aboriginal and Torres Strait Islander people, 24 hours",
      phone: "1800 064 865",
      link: "https://www.vals.org.au",
    },
  ],
  migration: [
    {
      service: "Refugee Legal",
      who: "free legal help with visa and migration matters",
      link: "https://refugeelegal.org.au",
    },
    {
      service: "Registered migration agents (OMARA register)",
      who: "check that anyone advising you on a visa is registered",
      link: "https://www.mara.gov.au",
    },
  ],
  "privative-clause": [
    {
      service: "Victoria Legal Aid",
      who: "free legal information and advice — Legal Help line",
      phone: "1300 792 387",
      link: "https://www.legalaid.vic.gov.au",
    },
    {
      service: "Community legal centres",
      who: "free local legal help — find your nearest centre",
      link: "https://www.fclc.org.au",
    },
  ],
  // Timing reasons never reach the stop screen (they are URGENT, not STOP), but the record
  // has to be total; the urgent banner uses the decision's own services.
  "hearing-on-foot": [],
  "deadline-imminent-or-passed": [],
};

/** The services to show for a set of stop reasons, de-duplicated, most specific first. */
export function servicesForStop(reasons: TripwireReason[]): HelpService[] {
  const out: HelpService[] = [];
  for (const r of reasons) {
    for (const s of TRIPWIRE_SERVICES[r] ?? []) {
      if (!out.some((x) => x.service === s.service)) out.push(s);
    }
  }
  return out;
}

/**
 * What we can safely offer on a hand-over screen, per stop reason.
 *
 * A bare "talk to a free legal service" adds nothing. But we cannot analyse a matter our
 * corpus does not cover, so everything offered here is about USING the appointment — what
 * to bring, what to ask, and a note to take along. None of it asserts a legal proposition,
 * names a forum, or states a time limit, so it is safe for every reason.
 *
 * `urgentPerson` marks the cohorts where "today" genuinely matters: someone at risk of
 * being charged or already held, and child-protection or compulsory-treatment matters,
 * which are routinely listed within days.
 *
 * NOTE the deliberate absence: no reason receives a draft letter. A written statement to a
 * child-protection department, a treating authority or a prosecuting agency is evidence in
 * a forum none of our knowledge sources covers. Whether that may ever change for family
 * matters is a legal call, not an engineering one.
 */
export interface StopCapabilities {
  urgentPerson: boolean;
}

const STOP_CAPABILITIES: Record<TripwireReason, StopCapabilities> = {
  "family-guardianship-mental-health": { urgentPerson: true },
  criminal: { urgentPerson: true },
  detention: { urgentPerson: true },
  migration: { urgentPerson: false },
  "privative-clause": { urgentPerson: false },
  "hearing-on-foot": { urgentPerson: false },
  "deadline-imminent-or-passed": { urgentPerson: false },
};

/** Most-restrictive-wins across every reason that fired. */
export function capabilitiesForStop(reasons: TripwireReason[]): StopCapabilities {
  return { urgentPerson: reasons.some((r) => STOP_CAPABILITIES[r]?.urgentPerson) };
}
