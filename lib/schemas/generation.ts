import { z } from "zod";

/**
 * Structured shapes the model MUST return. Validating the envelope with Zod is the
 * "structure gate" (TECHNICAL_SPEC §6); a malformed envelope triggers a cheap
 * content-preserving repair pass (harness §11), never a content rewrite.
 */

/** A grounded plain-language answer (the Ask flow + FAQ engine). */
export const GeneratedAnswerSchema = z.object({
  /** false = the corpus does not cover this; route to help (never fabricate). */
  covered: z.boolean(),
  /** Plain restatement of the question (Ask format, KNOWLEDGE/answer-structures). */
  restated: z.string().default(""),
  /** The grounded answer in short plain sentences. */
  answer: z.string().default(""),
  /** A neutral next step (never "you should…"). */
  nextStep: z.string().default(""),
  /** Source strings — MUST be drawn from the matched entry's sources. */
  sources: z.array(z.string()).default([]),
});
export type GeneratedAnswer = z.infer<typeof GeneratedAnswerSchema>;

/** A plain-language decode of a letter (the Decode flow). */
export const GeneratedDecodeSchema = z.object({
  covered: z.boolean(),
  /** "What this letter is" — one line. */
  whatItIs: z.string().default(""),
  /** "What it means for you" — 2–3 plain sentences. */
  whatItMeans: z.string().default(""),
  /** Neutral list of options the person may have (no advice). */
  options: z.array(z.string()).default([]),
  sources: z.array(z.string()).default([]),
});
export type GeneratedDecode = z.infer<typeof GeneratedDecodeSchema>;
