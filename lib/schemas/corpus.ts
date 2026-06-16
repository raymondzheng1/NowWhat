import { z } from "zod";

/**
 * The pathway corpus is the ONLY source of legal substance (TECHNICAL_SPEC §0/§2).
 * Accuracy is safety: every deadline/figure carries a source + lastVerified, and
 * the app NEVER renders a deadline figure that isn't verified + sourced.
 *
 * Seed entries ship with `status: "seed"` and VERIFY markers; their unverified
 * facts are shown as "we need to confirm this — here's who can help", never asserted.
 */

const NonEmpty = z.string().trim().min(1);

/** Reviewable status of a decision type. */
export const ReviewableSchema = z.object({
  value: z.enum(["yes", "no", "sometimes"]),
  basis: NonEmpty,
  /** When false, the basis text is treated as unverified (shown with a confirm-this note). */
  verified: z.boolean().default(false),
});

/** One review route (internal review / merits review / Ombudsman / court). */
export const PathwaySchema = z.object({
  name: NonEmpty,
  body: NonEmpty,
  /** Human-readable deadline text (may contain "VERIFY" until confirmed). */
  deadline: NonEmpty,
  /**
   * Numeric days for date computation. ONLY used to compute a concrete date when
   * `deadlineVerified === true` AND a real (non-VERIFY) source is present.
   */
  deadlineDays: z.number().int().positive().nullable().default(null),
  deadlineVerified: z.boolean().default(false),
  howCounted: NonEmpty.optional(),
  howToStart: NonEmpty,
  /** Whether this route generally has a fee (merits review is usually free). */
  cost: z.string().optional(),
  source: NonEmpty,
});

export const RightToReasonsSchema = z.object({
  available: z.enum(["yes", "no", "sometimes"]),
  how: NonEmpty,
  provision: NonEmpty,
  source: NonEmpty,
  verified: z.boolean().default(false),
});

export const HelpServiceSchema = z.object({
  service: NonEmpty,
  who: NonEmpty,
  /** A real URL or phone; "VERIFY" until confirmed. Never a fabricated link. */
  link: NonEmpty,
});

/** A single corpus pathway entry (one decision type). */
export const PathwayEntrySchema = z.object({
  id: NonEmpty,
  title: NonEmpty,
  jurisdiction: NonEmpty,
  status: z.enum(["seed", "verified"]).default("seed"),
  decisionTypes: z.array(NonEmpty).min(1),
  issuers: z.array(NonEmpty).min(1),
  keywords: z.array(NonEmpty).default([]),
  reviewable: ReviewableSchema,
  pathways: z.array(PathwaySchema).min(1),
  rightToReasons: RightToReasonsSchema,
  groundsOrCriteria: z.array(NonEmpty).default([]),
  evidenceChecklist: z.array(NonEmpty).default([]),
  getHelp: z.array(HelpServiceSchema).min(1),
  plainLanguageExplainer: NonEmpty,
  sources: z.array(NonEmpty).min(1),
  /** ISO date (YYYY-MM-DD) or null until a human verifies the entry. */
  lastVerified: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .default(null),
  /** Optional extended plain-language notes (markdown body of the file). */
  body: z.string().default(""),
});

export type PathwayEntry = z.infer<typeof PathwayEntrySchema>;
export type Pathway = z.infer<typeof PathwaySchema>;
export type HelpService = z.infer<typeof HelpServiceSchema>;

/** A classification token → entry id (built from decisionTypes/issuers/keywords). */
export const ClassificationTokenSchema = z.object({
  token: NonEmpty,
  entryId: NonEmpty,
  kind: z.enum(["decisionType", "issuer", "keyword", "title"]),
});

/** The built, committed corpus index (read-only at runtime). */
export const CorpusIndexSchema = z.object({
  builtAt: z.string(),
  entries: z.array(PathwayEntrySchema),
  classification: z.array(ClassificationTokenSchema),
  /** Flat, de-duplicated authority/source list across all entries. */
  sources: z.array(NonEmpty),
});

export type CorpusIndex = z.infer<typeof CorpusIndexSchema>;
export type ClassificationToken = z.infer<typeof ClassificationTokenSchema>;

/**
 * A deadline is renderable as a concrete date ONLY when verified + sourced.
 * Everything else is shown as "confirm the exact time limit". This is the
 * never-state-an-unsourced-deadline guarantee in code form.
 */
export function deadlineIsRenderable(p: Pathway): boolean {
  return (
    p.deadlineVerified === true &&
    typeof p.deadlineDays === "number" &&
    p.deadlineDays > 0 &&
    !/verify/i.test(p.source)
  );
}
