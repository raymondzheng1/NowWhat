import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRequestContext } from "@/lib/http/request-context";
import { apiJson } from "@/lib/http/respond";
import { precheck } from "@/lib/cost/guard";
import { getDataEntry } from "@/lib/data";
import { getEntry, FALLBACK_ENTRY_ID } from "@/lib/corpus/index";
import { runBrief, briefProse } from "@/lib/generation/runner";
import { isModelConfigured } from "@/lib/generation/anthropic";
import { contextForPath } from "@/lib/memo/path-context";
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
// Room for the in-depth working too: each point argued both ways roughly doubles the output.
const BRIEF_TOKENS = 4800;

/** One side of one point in the in-depth working: longer than this is dropped, not shown. */
// Generous on purpose: a ground with four parts runs past 140 words honestly, and was dropped
// whole — the fourth of four marked grounds showed no case for or against (2026-11-02).
const DEPTH_MAX_WORDS = 240;

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
  /** What they said they want, in the page's words or theirs. Without it the brief guessed. */
  goals: z.array(z.string().max(300)).max(12).default([]),
});

/** The SOURCES lines of a context, as the brief may cite them. */
function contextSourceLines(context: string): string[] {
  const at = context.indexOf("SOURCES (");
  if (at === -1) return [];
  return context
    .slice(at)
    .split("\n")
    .slice(1)
    .map((l) => l.replace(/^\s*-\s*/, "").trim())
    .filter(Boolean);
}

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

  const { context, extraSources } = contextForPath(entry, {
    pathId: body.pathId,
    groundIds: body.groundIds,
    criteria: body.criteria,
    forum: body.forum,
    pathName: body.pathName,
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
    // Labelled, so the brief can say what they want from what they SAID, and nothing else.
    body.goals.length ? `WHAT THEY SAID THEY WANT: ${body.goals.map((g) => g.trim()).filter(Boolean).join("; ")}` : "",
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
      extraSources,
      // What it was given and what they said — see the verifier. Grounded either way.
      groundedText: context,
      accountText: theirWords,
      contextSources: contextSourceLines(context),
      maxTokens: BRIEF_TOKENS,
    });
  } catch {
    return notCovered();
  }
  // `theirWords` and `body` go out of scope here. Nothing is written anywhere.

  if (result.status !== "answered" || !result.data) {
    return notCovered(result.rejectedGates ?? (result.reason ? [result.reason] : []));
  }
  if (!result.data.covered) return notCovered(["model-declined"]);

  // A CUT-OFF BRIEF IS NOT A SHORT ONE. When the output ran out of room, the repair pass
  // closed the JSON and what came back stopped mid-sentence, with the last parts empty — and
  // it passed every gate, because an empty field says nothing wrong. Every part the prompt
  // asks for must be there, or the person gets the full notes instead.
  const d = result.data;
  const incomplete =
    !d.situation.trim() ||
    !d.path.trim() ||
    !d.otherSide.trim() ||
    d.points.some((p) => !p.relates.trim() || !p.needed.trim());
  if (incomplete) return notCovered(["incomplete"]);

  const prose = briefProse(result.data);

  // The memo's own citation gate, on top of the verifier: a case, Act or section that did not
  // come from our knowledge base never ships, even if it happens to be real.
  // An Act or case THEY named is theirs to have named; the brief may say they mentioned it.
  const invented = checkMemoCitations(prose, `${context}\n${theirWords}`);
  if (invented.length > 0) return notCovered(["out-of-corpus-citation"]);

  // Short is the point of it. A brief that ran long is refused rather than shown as the short one.
  const shortProse = briefProse(result.data, { short: true });
  if (shortProse.split(/\s+/).filter(Boolean).length > BRIEF_MAX_WORDS) return notCovered(["too-long"]);

  // The in-depth working: every word already through the verifier and the citation gate above.
  // An entry that ran long or left a side empty is dropped on its own; the brief still ships.
  const wordsIn = (x: string) => x.split(/\s+/).filter(Boolean).length;
  const depth = (result.data.depth ?? [])
    .filter((x) => x.for.trim() && x.against.trim())
    .filter((x) => wordsIn(x.for) <= DEPTH_MAX_WORDS && wordsIn(x.against) <= DEPTH_MAX_WORDS)
    .slice(0, 7);

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
        depth,
        sources: result.data.sources,
      },
    },
    ctx,
  );
}
