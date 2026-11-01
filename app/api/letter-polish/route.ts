import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRequestContext } from "@/lib/http/request-context";
import { apiJson } from "@/lib/http/respond";
import { precheck } from "@/lib/cost/guard";
import { getEntry, FALLBACK_ENTRY_ID } from "@/lib/corpus/index";
import { runLetterPolish } from "@/lib/generation/runner";
import { isModelConfigured } from "@/lib/generation/anthropic";
import { caseMaxWords, checkLetterFidelity } from "@/lib/letter/fidelity";
import { checkMemoCitations } from "@/lib/memo/qa";
import { runLetterCase } from "@/lib/generation/runner";
import { getDataEntry } from "@/lib/data";
import { getGround } from "@/lib/legal";
import { contextForPath } from "@/lib/memo/path-context";
import { withCriterionIds } from "@/lib/memo/criteria";
import { assemble, bodyOnly, splitBones } from "@/lib/letter/bones";
import { periodsAreTheirs } from "@/lib/grounds/match";
import { checkNoCaseCitation } from "@/lib/verification/own-words";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Attempts at the shorter letter per request: one, then one more if it was refused. */
// The sections of the case document for each path, in order (the owner's ruling, 2026-11-01):
// the decision and its reasons, what is asked for, the facts, then the grounds or reasons.
const CASE_HEADINGS = {
  "judicial-review": ["The decision and its reasons", "What I ask the court to do", "Summary of the facts", "Grounds of review"],
  "merits-review": ["The decision and its reasons", "What I ask the tribunal to decide", "Summary of the facts", "Why the decision should be changed"],
  "internal-review": ["The decision and its reasons", "What I ask for", "Summary of the facts", "Why the decision should be reviewed"],
} as const;
const LETTER_ATTEMPTS = 2;

/**
 * Rewrite a draft letter so it reads as a competent adult wrote it.
 *
 * WHAT IS AND IS NOT AT STAKE HERE. This letter goes to a government office over the
 * person's name. The existing `letter` task, which decides which of their own words go under
 * which heading, may not add an adverb — because they must be able to answer "what makes you
 * say that?" from memory. That rule is untouched. What this task rewrites is OUR framing:
 * the template sentences that open, join and close the letter, which were written by us and
 * are ours to word better.
 *
 * FOUR GATES, and any one of them keeps the deterministic draft:
 *   1. The model is given the draft and their own words, and nothing else.
 *   2. `verifyOutput` — no advice, no prediction, nothing out of corpus, reading level. The
 *      WHOLE letter goes to it, because here every sentence is customer-visible output.
 *   3. `checkLetterFidelity` — every blank the person still has to fill survives, no new
 *      blank appears, every figure traces to the draft or to their account, and the letter
 *      still has its addressee, subject line and sign-off.
 *   4. `checkMemoCitations` — no case, Act or section that was not already there.
 *
 * Nothing is stored. The draft and their words are processed in memory and discarded on
 * response, exactly as the memo route does.
 */

const BodySchema = z.object({
  entryId: z.string().min(1).max(64),
  /** The deterministic draft, which is also the benchmark every gate measures against. */
  draft: z.string().min(1).max(12000),
  /** Their own account, so a figure they themselves gave is allowed to stay. */
  theirWords: z.string().max(8000).default(""),
  /**
   * Present for the three review letters: everything the flow learned, so the letter makes
   * their case instead of shortening their account (the owner's ruling, 2026-11-01). Absent
   * for the enquiries — a request for reasons or for the court form — which stay short.
   */
  case: z
    .object({
      pathId: z.enum(["internal-review", "merits-review", "judicial-review"]),
      forum: z.string().max(200).default(""),
      pathName: z.string().max(200).default(""),
      goals: z.array(z.string().max(300)).max(12).default([]),
      groundIds: z.array(z.string().max(64)).max(20).default([]),
      criteria: z.array(z.string().max(600)).max(20).default([]),
      notes: z.record(z.string(), z.string().max(4000)).default({}),
      analysis: z
        .object({
          situation: z.string().max(2000).default(""),
          points: z
            .array(z.object({ ref: z.string().max(200), relates: z.string().max(1200), needed: z.string().max(1200) }))
            .max(6)
            .default([]),
          otherSide: z.string().max(1500).default(""),
          /** Each point argued both ways — the statement argues the one and answers the other. */
          depth: z
            .array(z.object({ ref: z.string().max(200), for: z.string().max(1500), against: z.string().max(1500) }))
            .max(7)
            .default([]),
        })
        .nullable()
        .default(null),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  const ctx = getRequestContext(req);
  // WHICH GATE REFUSED, by name. A refusal looked exactly like a missing key from outside —
  // the page silently kept the long version and nobody could say why, which is how the
  // shorter letter failed on a real account without anyone noticing. Gate names are a fixed
  // set of identifiers, never the model's text, so nothing about the person travels here.
  const notCovered = (gates: string[] = []) =>
    apiJson(
      {
        ok: true,
        status: "not-covered" as const,
        ...(gates.length ? { gates: [...new Set(gates)] } : {}),
      },
      ctx,
    );

  let body: z.infer<typeof BodySchema>;
  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return apiJson({ ok: false, status: "error", message: "errors.badInput" }, ctx, 400);
    }
    body = parsed.data;
  } catch {
    return apiJson({ ok: false, status: "error", message: "errors.badInput" }, ctx, 400);
  }

  if (!isModelConfigured()) return notCovered();

  const guard = await precheck(ctx.guard);
  if (!guard.allowed) {
    const code =
      guard.reason === "rate" ? 429 : guard.reason === "unconfigured" || guard.reason === "error" ? 503 : 200;
    return apiJson({ ok: false, status: "blocked", reason: guard.reason, message: guard.message }, ctx, code);
  }

  const verifyEntry = getEntry(body.entryId) ?? getEntry(FALLBACK_ENTRY_ID);
  if (!verifyEntry) return notCovered();

  // ONE MORE TRY. Measured on a real 493-word account, a single attempt was refused about one
  // time in three — the model declining, or one gate catching a slip — and the person was left
  // with the long letter. The page shows the full letter while this runs, so a second attempt
  // costs a few cents and some seconds nobody waits on, and every gate still applies to it.
  let lastGates: string[] = [];
  let hint: string | undefined;
  for (let attempt = 0; attempt < LETTER_ATTEMPTS; attempt++) {
    const out = await attemptLetter(verifyEntry, hint);
    if ("letter" in out) {
      return apiJson({ ok: true, status: "answered" as const, letter: out.letter }, ctx);
    }
    lastGates = out.gates;
    // Told what the route's own gates refused — names and our counts, never the rejected text.
    hint = out.hint;
  }
  return notCovered(lastGates);

  async function attemptLetter(
    entry: NonNullable<typeof verifyEntry>,
    hint?: string,
  ): Promise<{ letter: string } | { gates: string[]; hint?: string }> {
  if (body.case) return attemptCase(entry, body.case, hint);
  let result;
  try {
    result = await runLetterPolish({
      entry,
      // The draft IS the context: it is the only material the letter may draw on, and the
      // gates below measure the rewrite against it.
      context: body.draft,
      userInput: body.draft,
      guard: ctx.guard,
      byoKeyValue: ctx.byoKeyValue,
      // Room for the whole letter. The shared 1200 is a TRUNCATION, not a length limit: a
      // letter around a long account overran it, came back as half a JSON object, and the
      // person was left with the draft and no word why — the memo's lesson, again. The
      // fidelity gate's "too-long" is what keeps the letter short; this only keeps it whole.
      maxTokens: 2000,
      // An Act or a figure the person named is in the draft, so it is theirs to keep: the
      // verifier refused the owner's judicial-review letter for repeating "Animal Welfare Act
      // 2002" from their own account. The fidelity gate below still refuses anything NEW.
      groundedText: body.draft,
      accountText: body.theirWords,
    });
  } catch {
    return { gates: ["error"] };
  }

  if (result.status !== "answered" || !result.data) {
    return { gates: result.rejectedGates ?? (result.reason ? [result.reason] : []) };
  }
  if (!result.data.covered) return { gates: ["model-declined"] };

  const rewritten = result.data.letter;
  const fidelity = checkLetterFidelity(body.draft, body.theirWords, rewritten);
  if (fidelity.length > 0) return { gates: fidelity.map((f) => f.gate) };
  if (checkMemoCitations(rewritten, body.draft).length > 0) return { gates: ["out-of-corpus-citation"] };
  return { letter: rewritten };
  }

  /**
   * The case letter. Same gates as the shorter one — no new fact, figure, name or blank; the
   * bones and the warning blocks intact; no advice, prediction or score — measured against the
   * draft, their material AND the corpus context, because arguing from the law is now its job.
   * Two more: every citation must be in that context or their words, and any period of time it
   * states must be one they gave (the context's time rule is printed by the page, not argued).
   */
  async function attemptCase(
    entry: NonNullable<typeof verifyEntry>,
    c: NonNullable<z.infer<typeof BodySchema>["case"]>,
    hint?: string,
  ): Promise<{ letter: string } | { gates: string[]; hint?: string }> {
    const data = getDataEntry(body.entryId);
    if (!data) return { gates: ["unknown-entry"] };
    const { context } = contextForPath(data, {
      pathId: c.pathId,
      groundIds: c.groundIds,
      criteria: c.criteria,
      forum: c.forum,
      pathName: c.pathName,
    });
    // A point's name as the person saw it: the ground's plain name, or the criterion's words.
    const criterionText = new Map(withCriterionIds(c.criteria).map((x) => [x.id, x.text]));
    const noteName = (k: string) => getGround(k)?.plainName ?? criterionText.get(k) ?? k;
    const notes = Object.entries(c.notes)
      .filter(([, v]) => v.trim())
      .map(([k, v]) => `On "${noteName(k)}": ${v.trim()}`);
    const theirs = [body.theirWords.trim(), ...notes].filter(Boolean).join("\n\n");
    const a = c.analysis;
    const maxWords = caseMaxWords(c, body.draft);
    // The model writes the body; the head and the sign-off go back on from the draft, exactly
    // (see lib/letter/bones). A draft whose bones cannot be found is sent whole, as before.
    const bones = splitBones(body.draft);
    const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length;
    const bodyMax = bones ? maxWords - wordCount(bones.head) - wordCount(bones.tail) : maxWords;
    const material = [
      bones
        ? `LENGTH: about ${Math.round(bodyMax * 0.75)} words for what you write. Never more than ${bodyMax - 50}.`
        : `LENGTH: about ${Math.round(maxWords * 0.75)} words in all, counting the bones and any NOTE TO YOURSELF block. Never more than ${maxWords - 50}.`,
      "",
      ...(bones
        ? ["THE TOP OF THE DOCUMENT (printed above what you write — never copy it):", bones.head, "", "THE DRAFT'S BODY:", bones.body]
        : ["THE DRAFT:", body.draft]),
      "",
      "THEIR ACCOUNT:",
      body.theirWords.trim(),
      c.goals.length ? `\nWHAT THEY SAID THEY WANT: ${c.goals.join("; ")}` : "",
      notes.length ? `\nWHAT THEY WROTE UNDER THE POINTS THEY MARKED:\n${notes.join("\n")}` : "",
      a && (a.points.length || a.otherSide || a.depth.length)
        ? [
            "",
            "ANALYSIS (how their facts relate to the law above — build on it, but every fact must still come from their account):",
            a.situation,
            ...a.points.map((p) => `- ${noteName(p.ref)}: ${p.relates} ${p.needed}`.trim()),
            ...a.depth.flatMap((d) => [
              "",
              `ON "${noteName(d.ref)}"`,
              `THE CASE FOR IT (argue this): ${d.for}`,
              `THE CASE AGAINST IT (answer this from their facts; never concede it): ${d.against}`,
            ]),
            a.otherSide ? `WHAT THE DECISION-MAKER MAY SAY OVERALL (answer it): ${a.otherSide}` : "",
          ]
            .filter((x) => x !== null)
            .join("\n")
        : "",
      `\nSECTION HEADINGS, in order: ${CASE_HEADINGS[c.pathId].join(" | ")}`,
    ]
      .filter((x) => x !== "")
      .join("\n");

    let result;
    try {
      result = await runLetterCase({
        entry,
        context,
        userInput: material,
        guard: ctx.guard,
        byoKeyValue: ctx.byoKeyValue,
        maxTokens: 3200,
        groundedText: `${context}\n${body.draft}`,
        accountText: theirs,
        retryHint: hint,
      });
    } catch {
      return { gates: ["error"] };
    }
    if (result.status !== "answered" || !result.data) {
      return { gates: result.rejectedGates ?? (result.reason ? [result.reason] : []) };
    }
    if (!result.data.covered) return { gates: ["model-declined"] };

    // Bones back on, exactly, around what was written; every gate below sees the whole document.
    const letter = bones ? assemble(bones, bodyOnly(result.data.letter, bones)) : result.data.letter;
    const fidelity = checkLetterFidelity(body.draft, theirs, letter, {
      known: context,
      maxWords,
      // The bones go back on exactly, so theirs are the blanks that must survive; the body's are
      // there to be filled from what they told us.
      ...(bones ? { blanksFrom: `${bones.head}\n${bones.tail}` } : {}),
    });
    if (fidelity.length > 0) {
      return {
        gates: fidelity.map((f) => f.gate),
        // An invented name is told as the word it was, so the next try can drop exactly that.
        hint: fidelity.map((f) => `${f.gate} — ${f.detail}`).join("; "),
      };
    }
    if (checkMemoCitations(letter, `${context}\n${body.draft}\n${theirs}`).length > 0) {
      return { gates: ["out-of-corpus-citation"] };
    }
    if (!periodsAreTheirs(letter, `${body.draft}\n${theirs}`)) return { gates: ["time-limit-stated"] };
    // The context carries the leading cases, for the analysis. A letter to the agency names
    // none: a self-represented person should not be answering for case law in their own name.
    if (!checkNoCaseCitation([letter])) return { gates: ["case-citation"] };
    return { letter };
  }
}
