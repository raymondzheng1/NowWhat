import { z } from "zod";

/**
 * The lawyer-verified PROCEDURAL data layer (`data/pathways/` → `data/index.json`).
 * This is a SEPARATE knowledge source from the legal-substance corpus: it holds
 * real-world deadlines/forms/fees/agencies/bodies/MR-criteria per decision type
 * (TECHNICAL_SPEC §0). NEVER sourced from the exam corpus, NEVER model-invented.
 *
 * Hard rules (mirrored by scripts/data-check.mjs):
 *  - `deadlineRule` is a PLAIN RULE, never a computed countdown ("X days left").
 *  - every entry carries `verifiedAsAt` + `sourceUrl` + `reviewCadenceDays` (staleness).
 *  - a numeric deadline figure may only appear on a `verified` entry with a real source.
 *  - this whole layer is a release gate (PRD §12): a supervising lawyer signs off before
 *    any entry flips from `seed` to `verified`.
 */

export const Jurisdiction = z.enum(["Vic", "Cth"]);
export type Jurisdiction = z.infer<typeof Jurisdiction>;

export const AvenueMRSchema = z.object({
  available: z.boolean(),
  /**
   * True where merits review exists ONLY if the enabling Act provides it — the catch-all
   * entries, which cover decisions we have no specific guide for. The path still shows, with
   * the condition attached. Setting `available: false` instead would hide the cheaper and more
   * useful route from the people least able to work out that it might exist.
   */
  conditional: z.boolean().default(false),
  /**
   * What KIND of body this actually is.
   *
   * The merits avenue was typed only as "merits review", so the Housing Appeals Office — a
   * departmental appeal — inherited the tribunal card wholesale, including remedies a
   * tribunal has and an internal reviewer does not. An external review put it plainly:
   * calling it merits review overstates its independence and statutory status.
   *
   * "mixed" is the common case here: fines go to internal review OR the Magistrates' Court,
   * housing to the Housing Appeals Office for a housing decision and VCAT for a notice to
   * vacate. Nothing is hidden on a mixed path; a caution travels with it instead.
   */
  character: z.enum(["tribunal", "internal", "mixed", "court"]).default("tribunal"),
  /** Merits-review body, e.g. "VCAT" (Vic) or "ART" (Cth). */
  body: z.string(),
  source: z.string(),
});

/**
 * Asking the decision-maker to look at its own decision again.
 *
 * This was not modelled at all. For most decisions this service covers it is the FIRST step
 * and the cheapest one — an Authorised Review Officer at Services Australia, the agency
 * review of a fine, the housing appeal — and it was reachable only as an explainer link,
 * while the result screen called merits and judicial review "the two paths". Worse, where an
 * entry did know about it, the fact was buried inside the merits-review body string
 * ("internal review by Services Australia, then the ART"), which handed a departmental
 * reviewer a tribunal's card.
 *
 * Populated only where a source names the step. The catch-all entries do not carry one: the
 * schemes differ too much for any general statement, which is why the decode corpus dropped
 * its own internal-review pathway for them.
 */
export const AvenueIRSchema = z.object({
  available: z.boolean().default(false),
  /** Who looks at it again, in the words the source uses. */
  body: z.string().default(""),
  source: z.string().default(""),
});

export const AvenueJRSchema = z.object({
  available: z.boolean(),
  /**
   * True where the entry covers decision-makers this path may not reach.
   *
   * Public housing is the case that created it: the entry covers the Director of Housing and
   * a community housing provider alike, and judicial review supervises conferred public power.
   * The app never learns which one made the decision — the person picks an AREA, not a body —
   * so it cannot gate the card, and offering a Supreme Court path unconditionally to someone
   * whose provider may not be amenable to it is the failure to avoid. The path still shows,
   * for the same reason `mr.conditional` shows: hiding it would keep a real route from people
   * who do have it. The condition travels with it.
   */
  conditional: z.boolean().default(false),
  /** Judicial-review forum, e.g. "SCV-O56" (Vic) / "FederalCourt" / "ADJR" / "HCA". */
  forum: z.string(),
  source: z.string(),
});

export const ReasonsRequestSchema = z.object({
  how: z.string(),
  provision: z.string(),
  /** A reasons request may extend an MR clock ONLY if the enabling Act says so. */
  extendsMR: z.union([z.boolean(), z.string()]),
  /**
   * Whether a reasons request moves a JR limitation period.
   *
   * This was `z.boolean()` with the comment "It NEVER pauses a JR limitation period" — a rule
   * the app cannot source, and one the owner ruled out on 2026-08-23. Some statutory judicial
   * -review schemes do run their period from when a requested statement of reasons arrives.
   * A flat `false` asserted the opposite for every decision in the layer, so this now takes the
   * same three-state shape as `extendsMR`: true, false, or a string saying it depends and who
   * to ask.
   */
  extendsJR: z.union([z.boolean(), z.string()]),
});

export const DataFormSchema = z.object({
  name: z.string(),
  link: z.string(),
  fee: z.string(),
  verifiedAsAt: z.string(),
});

export const HelpRefSchema = z.object({
  service: z.string(),
  link: z.string(),
  /** What this service does, in a few words — so the result names a service and says why. */
  who: z.string().optional(),
  /** A dialable number, rendered as a tap-to-call button. */
  phone: z.string().optional(),
});

/**
 * One procedural STAGE of a matter — an internal review, a tribunal application, an election
 * to go to court, an appeal.
 *
 * The layer used to hold ONE `deadlineRule` string per decision type, and that is why the
 * Victorian fines 28-day court election could attach a concrete date to a parking ticket: one
 * field was serving every stage of a matter with different rules. An external review set out
 * the fields a stage actually needs, and this is that list.
 *
 * NOTHING HERE MAY BE FILLED IN BY INFERENCE. Every field is a statement about procedure that
 * a person acts on, so a stage record is only worth having if a supervising lawyer confirmed
 * it against the provision. `stages` is therefore empty on every entry until that happens, and
 * `deadlineRule` remains the published prose in the meantime. data-check enforces that a stage,
 * once present, is complete — a half-filled stage is more dangerous than none.
 */
export const StageSchema = z.object({
  /** What this stage IS, in the words a person would use. */
  name: z.string().min(1),
  /** The body, and what kind of body it is — an internal reviewer is not a tribunal. */
  body: z.string().min(1),
  character: z.enum(["internal", "tribunal", "court", "complaint", "appeal"]),
  /** The event the clock runs from: the decision, notice of it, service, reasons received. */
  trigger: z.string().min(1),
  /** The period itself. `basis` records calendar or business days — they are not the same. */
  period: z.object({
    value: z.number().int().positive(),
    unit: z.enum(["day", "month", "year"]),
    basis: z.enum(["calendar", "business"]),
  }),
  /** Who may extend it and on what test, where an extension power exists. */
  extension: z.string().default(""),
  /** Who may apply at this stage, with its provision. */
  whoMayApply: z.string().default(""),
  /** PROVISION-level, not a site front page: the section that carries this rule. */
  source: z.object({
    provision: z.string().min(1),
    url: z.string().min(1),
    /** The compilation date of the instrument this was read from. */
    effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
});
export type Stage = z.infer<typeof StageSchema>;

/** Who maintains an entry, and who signed it. Separate people, separate acts. */
export const ApprovalSchema = z.object({
  /** Who keeps the entry current. Operational, not legal. */
  contentOwner: z.string().default(""),
  /** The supervising lawyer who approved it, and when. Empty means NOT approved. */
  lawyerApprover: z.string().default(""),
  lawyerApprovedAt: z.string().default(""),
});

export const DataPathwaySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  jurisdiction: Jurisdiction,
  /** Agency names used to classify a decision to this entry. */
  decisionMakers: z.array(z.string()).min(1),
  decisionTypes: z.array(z.string()).min(1),
  keywords: z.array(z.string()).default([]),
  avenue: z.object({
    /** Internal review — the first step for most decisions, where a source names one. */
    ir: AvenueIRSchema.default({ available: false, body: "", source: "" }),
    /**
     * How the paths for THIS scheme relate to each other.
     *
     * "sequence"     — they run in order, and the later ones usually follow the earlier.
     * "alternatives" — they are different choices a person makes, not stages.
     * unset          — we do not know, so the app says only that they are listed in the
     *                  order people usually consider them.
     *
     * This asserts nothing new. It encodes, in a field the UI can act on, what each entry
     * ALREADY states in prose: the fines criteria say internal review and the court election
     * "are two different choices, not steps in order", and the housing criteria say which
     * body applies "depends on the decision". Left unset where no source settles it — the
     * corpus is explicit that it varies: "For SOME schemes you have to do this first before
     * an outside body will look at your case."
     *
     * Getting this wrong is not cosmetic. Someone told that a fine must go to internal
     * review before court can miss the election window entirely.
     */
    pathsAre: z.enum(["sequence", "alternatives"]).optional(),
    mr: AvenueMRSchema,
    jr: AvenueJRSchema,
    /** A dignified endpoint when no review is available (Ombudsman / complaint / reasons). */
    noReviewEndpoint: z.string().nullable().default(null),
  }),
  /** PLAIN RULE — never a countdown. */
  deadlineRule: z.string().min(1),
  verifiedAsAt: z.string().min(1),
  sourceUrl: z.string().min(1),
  reviewCadenceDays: z.number().int().positive(),
  reasonsRequest: ReasonsRequestSchema,
  /** Tripwire flag — set per the enabling Act, NOT detected from the user's text. */
  privativeClause: z.boolean().default(false),
  forms: z.array(DataFormSchema).default([]),
  mrCriteria: z.array(z.string()).default([]),
  /**
   * What the INTERNAL reviewer considers for this decision type.
   *
   * Added 2026-09-10 with the third path, and it fixes a mis-attribution rather than adding
   * new content. `mrCriteria` was written when internal review shared the merits field, so
   * for some schemes the lawyer's list describes the internal reviewer: the Victorian fines
   * criteria are the statutory review grounds (mistake of identity, contrary to law, special
   * circumstances) that the ISSUING AGENCY applies, not what a Magistrates' Court decides
   * when a fine is heard on election. Splitting the avenue without splitting the list left
   * those grounds captioned "what they decide for a decision like yours" under a court.
   *
   * Nothing was rewritten to make this split: every line the lawyer supplied names the body
   * it is about, so each one was filed under the body it names. A line that states the
   * ROUTING between the two appears on both, because a person on either card needs it.
   */
  irCriteria: z.array(z.string()).default([]),
  /**
   * Kinds of decision this pathway covers, in the words a person would use. Shown as chips
   * on the tile so someone recognises their own situation instead of guessing.
   *
   * An example is a COVERAGE CLAIM: it says the Act named in this entry's deadlineRule
   * governs that decision, the review body is right for it, the reasons request addresses
   * the right decision-maker, and the help services actually help with it. So it may only
   * appear on a verified, sourced entry, and it may never state a time figure.
   */
  examples: z.array(z.string()).max(8).default([]),
  getHelp: z.array(HelpRefSchema).min(1),
  status: z.enum(["seed", "verified"]).default("seed"),
  /**
   * Structured, provision-level procedure. EMPTY until a lawyer supplies it — see
   * StageSchema. `deadlineRule` is what publishes today; this is what will replace it.
   */
  stages: z.array(StageSchema).default([]),
  /** Who maintains this entry and who signed it off. */
  approval: ApprovalSchema.default({ contentOwner: "", lawyerApprover: "", lawyerApprovedAt: "" }),
  /** True for the generic per-jurisdiction fallback entries. */
  isFallback: z.boolean().default(false),
});
export type DataPathway = z.infer<typeof DataPathwaySchema>;

export const DataClassificationTokenSchema = z.object({
  token: z.string(),
  entryId: z.string(),
  kind: z.enum(["decisionMaker", "decisionType", "keyword", "title"]),
});

export const DataIndexSchema = z.object({
  builtAt: z.string(),
  entries: z.array(DataPathwaySchema),
  classification: z.array(DataClassificationTokenSchema),
});
export type DataIndex = z.infer<typeof DataIndexSchema>;

/**
 * A procedural fact is renderable as a confirmed value ONLY when the entry is verified,
 * carries a real (non-VERIFY) source + date, and isn't stale. Otherwise the UI must
 * degrade to "we can't confirm this — here's the official source + urgent help" and
 * NEVER show a number (mirrors the deadline safety contract, PRD §5).
 */
export function isVerifyMarker(s: string | null | undefined): boolean {
  return typeof s === "string" && /\bverify\b/i.test(s);
}

export function dataIsConfirmable(e: Pick<DataPathway, "status" | "sourceUrl" | "verifiedAsAt">): boolean {
  return (
    e.status === "verified" &&
    !isVerifyMarker(e.sourceUrl) &&
    !isVerifyMarker(e.verifiedAsAt) &&
    /^\d{4}-\d{2}-\d{2}$/.test(e.verifiedAsAt)
  );
}
