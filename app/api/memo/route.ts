import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRequestContext } from "@/lib/http/request-context";
import { apiJson } from "@/lib/http/respond";
import { precheck } from "@/lib/cost/guard";
import { getDataEntry } from "@/lib/data";
import { getEntry, FALLBACK_ENTRY_ID } from "@/lib/corpus/index";
import { getConcept, getGround, getProcess } from "@/lib/legal";
import { runBrief, briefProse } from "@/lib/generation/runner";
import { isModelConfigured } from "@/lib/generation/anthropic";
import { buildMemoContext, memoExtraSources } from "@/lib/memo/context";
import { checkMemoCitations } from "@/lib/memo/qa";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Write the short analysis a person reads first.
 *
 * THIS IS THE ONE STEP IN /start THAT LEAVES THE DEVICE, and it exists because the analysis is
 * the product: everything before it gathers what a person knows, and this is where that turns
 * into something they — and a duty lawyer — can read in a minute. The rest of the flow still
 * computes on-device and still sends nothing.
 *
 * Since 2026-10-31, on the owner's call, this writes a SHORT brief (`runBrief`) instead of
 * inserts for the long memo. The long memo is still composed — deterministically, from the
 * corpus — and sits folded under the brief as the full notes for a lawyer.
 *
 * What that costs, and what protects it:
 *   · The request carries the person's own words. It is processed IN MEMORY and discarded on
 *     response — never stored, never logged, never echoed back into the response body. There
 *     is no database here to store it in.
 *   · The model is given ONLY our knowledge base (`buildMemoContext`) plus their words. It
 *     cannot reach anything else, which is the owner's rule: our analysis and our legal
 *     sources come from our own corpus and nowhere else.
 *   · The model writes prose ABOUT the law, never the law. Each point names a part of a test
 *     or a criterion by its id, and the page prints the corpus's words for it. The time limit,
 *     sources and disclaimer are placed by `composeBrief`, and the brief may state no time
 *     limit at all.
 *   · The brief must be short: over `BRIEF_MAX_WORDS` it is refused, not shown.
 *   · Output passes `verifyOutput` (no advice, no prediction, no out-of-corpus fact,
 *     source-binding, jurisdiction, reading level) and then `checkMemoCitations`, which
 *     rejects any case, Act or section the context did not supply.
 *   · ANY failure returns "not-covered". The client then keeps the deterministic memo, which
 *     needs no model at all — so a rejected draft costs the person nothing, and the app is
 *     never worse than it was before this route existed.
 */

/**
 * Room for the SHORT analysis. It is capped at four points whatever the person marked, so it
 * does not grow with the input the way the long memo did — but the ids and the sources it
 * copies back cost tokens, and a ceiling that is too low truncates the JSON and silently
 * loses the analysis (the memo's lesson). Billing is on tokens used, so headroom is free.
 */
const BRIEF_TOKENS = 1600;

/**
 * The brief is meant to be short; one that is not has stopped doing its job. Over this many
 * words of prose it is refused, and the person gets the full notes — the same fallback as any
 * other failed gate — rather than a long answer presented as the short one.
 */
const BRIEF_MAX_WORDS = 350;

const BodySchema = z.object({
  entryId: z.string().min(1).max(64),
  pathId: z.enum(["internal-review", "merits-review", "court-election", "judicial-review"]),
  forum: z.string().max(200).default(""),
  pathName: z.string().max(200).default(""),
  groundIds: z.array(z.string().max(64)).max(20).default([]),
  criteria: z.array(z.string().max(600)).max(20).default([]),
  /** What the person wrote. Bounded so one request cannot become an upload channel. */
  story: z.string().max(8000).default(""),
  notes: z.record(z.string(), z.string().max(4000)).default({}),
});

export async function POST(req: NextRequest) {
  const ctx = getRequestContext(req);
  const notCovered = () => apiJson({ ok: true, status: "not-covered" as const }, ctx);

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

  // No model configured (local dev, or a deployment without a key): the deterministic memo
  // is the product's baseline, so this degrades to it rather than erroring.
  if (!isModelConfigured()) return notCovered();

  const entry = getDataEntry(body.entryId);
  if (!entry) return notCovered();

  // Fail-closed spend control, before any model call.
  const guard = await precheck(ctx.guard);
  if (!guard.allowed) {
    const code =
      guard.reason === "rate" ? 429 : guard.reason === "unconfigured" || guard.reason === "error" ? 503 : 200;
    return apiJson({ ok: false, status: "blocked", reason: guard.reason, message: guard.message }, ctx, code);
  }

  // ONLY A PATH THAT IS ONE OF THE TWO CORPUS PROCESSES GETS ONE.
  //
  // Stated positively on purpose. Written the other way round — "everything that is not an
  // internal review is merits review" — it handed the merits process to a court election,
  // and the model would then have been told that the body asks "Is this the correct or
  // preferable decision?" and can set the decision aside and substitute its own. A court
  // hearing a charge on election does neither. That mis-label has been patched on the card,
  // in the plan, in the hand-off and in the memo heading; this is the last place it could
  // still have entered, and it enters as the one thing a gate cannot catch, because the
  // sentence would be true of some other body.
  const proc =
    body.pathId === "judicial-review"
      ? getProcess("judicial-review") ?? null
      : body.pathId === "merits-review"
        ? getProcess("merits-review") ?? null
        : null;
  const internal = body.pathId === "internal-review" ? getConcept("internal-review") ?? null : null;
  // Grounds of review belong to judicial review; carrying them elsewhere would invite an
  // application written against the wrong test.
  const grounds =
    body.pathId === "judicial-review"
      ? body.groundIds.map((id) => getGround(id)).filter((g): g is NonNullable<typeof g> => !!g)
      : [];

  const context = buildMemoContext({
    entry,
    process: proc,
    internal,
    grounds,
    criteria: body.criteria,
    forum: body.forum || entry.title,
    pathName: body.pathName || "review",
  });

  // The verifier's allow-list is a decode-corpus entry. The two knowledge sources share ids
  // for the decisions they both cover; where they do not, the jurisdiction fallback keeps the
  // jurisdiction and no-advice gates live rather than skipping verification.
  const verifyEntry = getEntry(body.entryId) ?? getEntry(FALLBACK_ENTRY_ID);
  if (!verifyEntry) return notCovered();

  const theirWords = [
    body.story.trim(),
    ...Object.entries(body.notes)
      .filter(([, v]) => v.trim())
      .map(([k, v]) => `On "${k}": ${v.trim()}`),
  ]
    .filter(Boolean)
    .join("\n\n");
  if (!theirWords) return notCovered();

  let result;
  try {
    result = await runBrief({
      entry: verifyEntry,
      context,
      userInput: theirWords,
      guard: ctx.guard,
      byoKeyValue: ctx.byoKeyValue,
      extraSources: memoExtraSources({ entry, process: proc, internal, grounds }),
      maxTokens: BRIEF_TOKENS,
    });
  } catch {
    return notCovered();
  }
  // `theirWords` and `body` go out of scope here. Nothing is written anywhere.

  if (result.status !== "answered" || !result.data) return notCovered();
  if (!result.data.covered) return notCovered();

  const prose = briefProse(result.data);

  // The memo's own citation gate, on top of the verifier: a case, Act or section that did not
  // come from our knowledge base never ships, even if it happens to be real.
  const invented = checkMemoCitations(prose, `${context}\n${entry.deadlineRule}`);
  if (invented.length > 0) return notCovered();

  // Short is the point of it. A brief that ran long is refused rather than shown as the short one.
  if (prose.split(/\s+/).filter(Boolean).length > BRIEF_MAX_WORDS) return notCovered();

  return apiJson(
    {
      ok: true,
      status: "answered" as const,
      brief: {
        situation: result.data.situation,
        path: result.data.path,
        points: result.data.points,
        otherSide: result.data.otherSide,
        toGather: result.data.toGather,
        sources: result.data.sources,
      },
    },
    ctx,
  );
}
