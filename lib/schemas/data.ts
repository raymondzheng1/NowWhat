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
  /** Merits-review body, e.g. "VCAT" (Vic) or "ART" (Cth). */
  body: z.string(),
  source: z.string(),
});

export const AvenueJRSchema = z.object({
  available: z.boolean(),
  /** Judicial-review forum, e.g. "SCV-O56" (Vic) / "FederalCourt" / "ADJR" / "HCA". */
  forum: z.string(),
  source: z.string(),
});

export const ReasonsRequestSchema = z.object({
  how: z.string(),
  provision: z.string(),
  /** A reasons request may extend an MR clock ONLY if the enabling Act says so. */
  extendsMR: z.union([z.boolean(), z.string()]),
  /** It NEVER pauses a JR limitation period. */
  extendsJR: z.boolean(),
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
  getHelp: z.array(HelpRefSchema).min(1),
  status: z.enum(["seed", "verified"]).default("seed"),
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
