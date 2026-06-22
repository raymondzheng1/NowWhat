import { z } from "zod";

/**
 * The legal-substance corpus (`corpus/legal/` → `corpus/legal/index.json`): grounds of
 * review, each ground's test broken into ELEMENTS (with a lay prompt), the leading cases
 * that explain each ground (pinpointed), and the MR-vs-JR triage. The ONLY source of
 * legal substance + citations (TECHNICAL_SPEC §0); the verifier rejects any authority
 * not here.
 *
 * SEED/v2 status: this is built from our admin-law materials and is a v2 feature behind
 * the legal-sign-off gate (PRD §12). Until populated + verified, grounds carry no
 * leading cases, so the v2 generator can cite nothing and degrades to "get help" — the
 * correct gated behaviour. Element lay-prompts are general legal information, not advice.
 */

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
  test: z.string().min(1),
  elements: z.array(ElementSchema).min(1),
  leadingCases: z.array(LeadingCaseSchema).default([]),
  status: z.enum(["seed", "verified"]).default("seed"),
});
export type Ground = z.infer<typeof GroundSchema>;

export const TriageSchema = z.object({
  jurisdictions: z.array(z.string()),
  mrVsJr: z.string(),
  remedies: z.object({ mr: z.string(), jr: z.string() }),
});
export type Triage = z.infer<typeof TriageSchema>;

export const LegalIndexSchema = z.object({
  builtAt: z.string(),
  grounds: z.array(GroundSchema),
  triage: TriageSchema,
});
export type LegalIndex = z.infer<typeof LegalIndexSchema>;
