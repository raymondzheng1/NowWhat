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
      /**
       * The same work, done one PART of the test at a time.
       *
       * A test is not a single question — `elements` has broken every ground into its parts
       * since the corpus was written. Writing to the ground as a whole is what a lay reader
       * can already do; walking each part and saying which of their facts reaches it is the
       * thing they cannot, and it is what the owner's worked memoranda do with s 17(1)(a),
       * (b) and (f)(viii) rather than with "the section".
       *
       * Defaulted to empty on purpose. An older draft, a model that returns the four
       * ground-level fields and nothing else, or a part it had nothing to say about all land
       * here as an absence — and the memo composes exactly as it did before, which is the
       * standing rule for this whole draft: it may only ever add.
       */
      elements: z
        .array(
          z.object({
            /**
             * The part's own id, copied from the context. Local to its ground ("notice",
             * "applies"), so it is only ever matched inside the ground it came from.
             * An id we did not supply matches nothing and is dropped, never rendered.
             */
            elementId: z.string(),
            /** What in their account RELATES to this part. Empty is a correct answer. */
            says: z.string().default(""),
            /** What a lawyer would want to know about this part. Never whether it is met. */
            missing: z.string().default(""),
          }),
        )
        .default([]),
    }),
  ),
  /**
   * The same work, against what the BODY decides rather than against a ground of review.
   *
   * Grounds of review belong to judicial review, and almost nobody arrives there: the paths
   * people actually take are an internal review, a tribunal, or electing to have a charge
   * heard. On those there are no grounds and no elements — what the decision turns on is the
   * lawyer-supplied criteria for that scheme, and the memo listed them and did none of the
   * work. This is the element walk applied to the criteria, which is where most readers of
   * this document will meet it.
   *
   * Top-level rather than nested in `application`, because a criterion belongs to the forum
   * and not to any one ground; on the paths where these are written, `application` is empty.
   * Defaulted to empty for the same reason as `elements`: this draft may only ever add.
   */
  criteria: z
    .array(
      z.object({
        /**
         * The criterion's id, copied from the context. Derived from the criterion's own
         * words (`lib/memo/criteria.ts`), so an id we did not supply matches nothing and is
         * dropped rather than filed under the wrong line.
         */
        criterionId: z.string(),
        /** What in their account RELATES to this criterion. Empty is a correct answer. */
        says: z.string().default(""),
        /** What a lawyer would want to know about it. Never whether it is met. */
        missing: z.string().default(""),
      }),
    )
    .default([]),
  sources: z.array(z.string()),
});
export type GeneratedMemo = z.infer<typeof GeneratedMemoSchema>;

/**
 * The short analysis — the thing a person reads first.
 *
 * The long memo copies every test, case and remedy from the corpus, and the owner's verdict on
 * it was plain: it reads as verbatim, and verbatim is not the value. This is the value: what
 * matters for THIS person's matter, said briefly. The long memo stays, folded away under it, as
 * the full notes a duty lawyer can open.
 *
 * What the model writes is prose ABOUT the law, never the law: each point names a part of a
 * test or a criterion by its id, and the heading printed above it is ours, from the corpus.
 * The time limit, the sources list and the disclaimer are placed by `composeBrief`, not here.
 *
 * Arrays carry no maximum on purpose. A model that returns five points instead of four should
 * not throw the whole analysis away at schema time; the composer keeps the first four.
 */
export const GeneratedBriefSchema = z.object({
  covered: z.boolean(),
  /** Two or three sentences: what happened, in their terms, and what they want. */
  situation: z.string().default(""),
  /** One or two sentences: the chosen path and what that body looks at, from the context. */
  path: z.string().default(""),
  /**
   * Only the parts of the test or criteria their account actually relates to. `ref` is an id
   * copied from the context; one we did not supply matches nothing and is dropped.
   */
  points: z
    .array(
      z.object({
        ref: z.string(),
        relates: z.string().default(""),
        needed: z.string().default(""),
      }),
    )
    .default([]),
  /** What the decision-maker will usually say back. Never an outcome. */
  otherSide: z.string().default(""),
  /** Documents or records that would help — noun phrases, not instructions. */
  toGather: z.array(z.string()).default([]),
  sources: z.array(z.string()).default([]),
});
export type GeneratedBrief = z.infer<typeof GeneratedBriefSchema>;

/**
 * A polished letter.
 *
 * One field, because the output IS the letter — there is nothing to assemble around it, and
 * every extra field would be another place for the model to put something the person did not
 * say. `covered` is the escape hatch: it says "I could not do this safely", and the caller
 * then keeps the deterministic draft.
 */
export const GeneratedLetterSchema = z.object({
  covered: z.boolean(),
  letter: z.string(),
  sources: z.array(z.string()).default([]),
});
export type GeneratedLetter = z.infer<typeof GeneratedLetterSchema>;
