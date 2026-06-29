import { z } from "zod";

/**
 * The legal-substance corpus (`corpus/legal/` → `corpus/legal/index.json`): the SINGLE
 * source for the "Learn" content — the two review PROCESSES (merits + judicial), the
 * MR-vs-JR COMPARISON, and the GROUNDS of review (each as a plain-language explainer).
 * Rendered deterministically (no model) across the library, the guided tour, and in-flow
 * in the Rights Saver — one concept set, many surfaces (TECHNICAL_SPEC §0).
 *
 * General public-legal-education information, NOT advice; grounds are shown neutrally
 * (no ranking/score); a fact may only "relate to" an element, never "satisfy" it. Leading
 * cases carry pinpoints and stay seed/VERIFY until populated + signed off (legal gate).
 */

export const ReviewKind = z.enum(["merits-review", "judicial-review"]);
export type ReviewKind = z.infer<typeof ReviewKind>;

export const JurisdictionName = z.enum(["Vic", "Cth"]);

// ---- Grounds ---------------------------------------------------------------
export const ElementSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** A plain-language prompt: "did anything you experienced relate to this?" */
  layPrompt: z.string(),
});

export const LeadingCaseSchema = z.object({
  name: z.string(),
  /** Corpus pinpoint (e.g. "Notes p4", a paragraph) — bound by the verifier. */
  pinpoint: z.string(),
  explains: z.string().default(""),
});

export const GroundSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  plainName: z.string().min(1),
  /** One-sentence summary for cards/teasers. */
  oneLine: z.string().min(1),
  /** 2–3 plain sentences explaining the ground. */
  whatItMeans: z.string().min(1),
  /** A concrete, everyday example. */
  plainExample: z.string().min(1),
  /** Neutral lay prompts — "what might relate to this" (never "this proves your case"). */
  whatRelates: z.array(z.string()).min(1),
  /** A common misunderstanding — "what this does NOT mean". */
  whatItIsNot: z.string().default(""),
  /** Which process(es) this ground is used in (mostly judicial review). */
  usedIn: z.array(ReviewKind).min(1),
  test: z.string().min(1),
  elements: z.array(ElementSchema).min(1),
  leadingCases: z.array(LeadingCaseSchema).default([]),
  sources: z.array(z.string()).default([]),
  status: z.enum(["seed", "verified"]).default("seed"),
});
export type Ground = z.infer<typeof GroundSchema>;

// ---- Processes (merits review / judicial review) ---------------------------
export const ProcessBodySchema = z.object({
  jurisdiction: JurisdictionName,
  name: z.string(),
  note: z.string().default(""),
});

export const ProcessSchema = z.object({
  id: ReviewKind,
  name: z.string().min(1),
  plainName: z.string().min(1),
  oneLine: z.string().min(1),
  /** The core question this process asks. */
  question: z.string().min(1),
  /** 2–4 plain sentences. */
  whatItIs: z.string().min(1),
  /** Who hears it, per jurisdiction. */
  bodies: z.array(ProcessBodySchema).min(1),
  /** Threshold points ("can you apply"): jurisdiction / standing / time. */
  canApply: z.array(z.string()).min(1),
  /** What happens, in plain steps. */
  whatHappens: z.array(z.string()).min(1),
  /** Possible outcomes/remedies. */
  remedies: z.array(z.string()).min(1),
  /** What this process can NOT do. */
  limits: z.array(z.string()).default([]),
  goodToKnow: z.array(z.string()).default([]),
  sources: z.array(z.string()).default([]),
  status: z.enum(["seed", "verified"]).default("seed"),
});
export type Process = z.infer<typeof ProcessSchema>;

// ---- Comparison + chooser --------------------------------------------------
export const ComparisonRowSchema = z.object({
  aspect: z.string(),
  mr: z.string(),
  jr: z.string(),
});

export const ChooserOptionSchema = z.object({
  prompt: z.string(),
  leadsTo: z.enum(["merits-review", "judicial-review", "both", "help"]),
  because: z.string(),
});

export const ComparisonSchema = z.object({
  intro: z.string().default(""),
  rows: z.array(ComparisonRowSchema).min(1),
  chooser: z.object({
    question: z.string(),
    options: z.array(ChooserOptionSchema).min(2),
  }),
});
export type Comparison = z.infer<typeof ComparisonSchema>;

// ---- Triage reference (existing) -------------------------------------------
export const TriageSchema = z.object({
  jurisdictions: z.array(z.string()),
  mrVsJr: z.string(),
  remedies: z.object({ mr: z.string(), jr: z.string() }),
});
export type Triage = z.infer<typeof TriageSchema>;

export const LegalIndexSchema = z.object({
  builtAt: z.string(),
  processes: z.array(ProcessSchema).default([]),
  comparison: ComparisonSchema,
  grounds: z.array(GroundSchema),
  triage: TriageSchema,
});
export type LegalIndex = z.infer<typeof LegalIndexSchema>;
