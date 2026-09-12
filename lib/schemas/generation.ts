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

/**
 * The memo drafter's output.
 *
 * It writes the APPLICATION — how this person's own words meet a test — and the narrative
 * that joins the sections. It does NOT write the law: the issue, the test, the cases, the
 * remedies and the time-limit rule are lifted verbatim from the knowledge base by
 * `composeMemo`, so there is nothing for a model to get wrong about them.
 *
 * There is no conclusion field, and that is deliberate. A conclusion on a legal point is a
 * prediction, and the owner removed predictions from this memo on 2026-08-22.
 */
export const GeneratedMemoSchema = z.object({
  covered: z.boolean(),
  /** One short paragraph: what this matter is, in plain words. Replaces a bullet list. */
  summary: z.string(),
  /** Per ground, keyed by ground id: how their words meet the test, argued both ways. */
  application: z.array(
    z.object({
      groundId: z.string(),
      /** What in their account speaks to this test. Their facts, never a verdict. */
      forThem: z.string(),
      /** What the decision-maker will say back. The half people never see coming. */
      against: z.string(),
      /** What a lawyer would want to see. Never "this will succeed". */
      toTest: z.string(),
    }),
  ),
  sources: z.array(z.string()),
});
export type GeneratedMemo = z.infer<typeof GeneratedMemoSchema>;
