import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRequestContext } from "@/lib/http/request-context";
import { apiJson } from "@/lib/http/respond";
import { precheck } from "@/lib/cost/guard";
import { getDataEntry } from "@/lib/data";
import { getEntry, FALLBACK_ENTRY_ID } from "@/lib/corpus/index";
import { runBrief, briefProse, runFrame, runPoint } from "@/lib/generation/runner";
import { isModelConfigured } from "@/lib/generation/anthropic";
import { contextForPath } from "@/lib/memo/path-context";
import { checkMemoCitations } from "@/lib/memo/qa";
import { getGround } from "@/lib/legal";
import { withCriterionIds } from "@/lib/memo/criteria";
import { inMyVoice } from "@/lib/letter/compose";
import { splitBones } from "@/lib/letter/bones";
import { assembleStatement, type CasePath } from "@/lib/letter/statement";
import { checkLetterFidelity } from "@/lib/letter/fidelity";
import { periodsAreTheirs } from "@/lib/grounds/match";
import { checkNoCaseCitation } from "@/lib/verification/own-words";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// The longest wait in the app. Room enough that a slow model never cuts it off mid-answer; the
// page offers a way out long before this (the owner's ask, 2026-11-02).
export const maxDuration = 300;

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
const BRIEF_TOKENS = 2400;
/** One point: both sides and the paragraph for their document, about 400 words at most. */
const POINT_TOKENS = 1600;
/** The statement's decision, request, facts and documents. */
const FRAME_TOKENS = 1400;
/** The paragraph a point gives their document: asked for in about 130 words. */
const ARGUMENT_MAX_WORDS = 220;

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
  /** The criteria they ticked, so the points worked through are theirs. */
  pickedCriteria: z.array(z.string().max(600)).max(20).default([]),
  /**
   * The plain statement of case from the page, when one is wanted: its head and sign-off are
   * kept exactly, and the statement is assembled inside them from the work done here.
   */
  statementDraft: z.string().max(12000).default(""),
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

  // ---- EVERYTHING AT ONCE (the owner's ask, 2026-11-02: quicker) ---------------------------
  //
  // The brief, each point argued both ways, and the statement's frame, as parallel calls. They
  // were one long call — the brief with every point's working inside it, about 30 seconds — and
  // then the statement waited for it and wrote every ground again, 25 to 70 seconds more. Now the
  // wait is the slowest single call, and the statement is assembled from the points' work.
  const points = pointsFor(body);
  const statementPath =
    body.statementDraft.trim() && body.pathId !== "court-election" ? (body.pathId as CasePath) : null;
  const bones = statementPath ? splitBones(body.statementDraft) : null;
  const settle = <T,>(p: Promise<T>) => p.catch(() => null);

  const [result, worked, frame] = await Promise.all([
    settle(
      runBrief({
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
      }),
    ),
    Promise.all(points.map((pt) => settle(workPoint(pt)))),
    bones && points.length
      ? settle(
          runFrame({
            entry: verifyEntry,
            context,
            userInput: theirWords,
            guard: ctx.guard,
            byoKeyValue: ctx.byoKeyValue,
            groundedText: context,
            accountText: theirWords,
            maxTokens: FRAME_TOKENS,
          }),
        )
      : Promise.resolve(null),
  ]);
  // `theirWords` and `body` go out of scope when this returns. Nothing is written anywhere.

  if (!result || result.status !== "answered" || !result.data) {
    return notCovered(result?.rejectedGates ?? (result?.reason ? [result.reason] : ["error"]));
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

  const prose = briefProse({ ...result.data, depth: [] });

  // The memo's own citation gate, on top of the verifier: a case, Act or section that did not
  // come from our knowledge base never ships, even if it happens to be real.
  // An Act or case THEY named is theirs to have named; the brief may say they mentioned it.
  const invented = checkMemoCitations(prose, `${context}\n${theirWords}`);
  if (invented.length > 0) return notCovered(["out-of-corpus-citation"]);

  // Short is the point of it. A brief that ran long is refused rather than shown as the short one.
  if (prose.split(/\s+/).filter(Boolean).length > BRIEF_MAX_WORDS) return notCovered(["too-long"]);

  // The in-depth working: each point that came back whole and cleared its gates. One that did
  // not is left out on its own — the analysis says so under it — and the brief still ships.
  const done = points.map((pt, i) => ({ pt, w: worked[i] ?? null }));
  const depth = done
    .filter((x): x is { pt: Point; w: Worked } => !!x.w)
    .map(({ pt, w }) => ({ ref: pt.id, for: w.for, against: w.against }));

  // THE STATEMENT, from that work: only when every point has its paragraph and the frame came
  // back, and only if the whole of it, assembled, clears every gate the written one faces.
  // Otherwise the page asks for it the slower way, as before.
  let statement: string | undefined;
  if (bones && statementPath && frame?.status === "answered" && frame.data?.covered && done.every((x) => x.w?.argument)) {
    const f = frame.data;
    const text = assembleStatement(bones, statementPath, {
      decision: f.decision,
      ask: f.ask,
      facts: f.facts,
      documents: f.documents.slice(0, 12),
      points: done.map(({ pt, w }) => ({ heading: pt.heading, argument: w!.argument })),
    });
    const draft = body.statementDraft;
    const fidelity = checkLetterFidelity(draft, theirWords, text, {
      known: context,
      maxWords: 100_000,
      blanksFrom: `${bones.head}\n${bones.tail}`,
    });
    const ok =
      fidelity.length === 0 &&
      checkMemoCitations(text, `${context}\n${draft}\n${theirWords}`).length === 0 &&
      periodsAreTheirs(text, `${draft}\n${theirWords}`) &&
      checkNoCaseCitation([text]);
    if (ok) statement = text;
  }

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
      ...(statement ? { statement } : {}),
    },
    ctx,
  );

  /**
   * One point, argued both ways and in their voice, against the law for that point alone — a
   * smaller context than the whole path's, so it is quicker as well as narrower. Its own gates:
   * the verifier (in the runner), the citation gate, a length cap per side, and for the
   * paragraph that goes into their document, no case named and no time limit they did not give.
   */
  async function workPoint(pt: Point): Promise<Worked | null> {
    const { context: own, extraSources: ownSources } = contextForPath(entry!, {
      pathId: body.pathId,
      groundIds: pt.kind === "ground" ? [pt.id] : [],
      criteria: pt.kind === "criterion" ? [pt.text] : [],
      forum: body.forum,
      pathName: body.pathName,
    });
    const r = await runPoint({
      entry: verifyEntry!,
      context: own,
      userInput: theirWords,
      guard: ctx.guard,
      byoKeyValue: ctx.byoKeyValue,
      extraSources: ownSources,
      groundedText: own,
      accountText: theirWords,
      contextSources: contextSourceLines(own),
      maxTokens: POINT_TOKENS,
    });
    if (r.status !== "answered" || !r.data?.covered) return null;
    const { for: forIt, against, argument } = r.data;
    if (!forIt.trim() || !against.trim()) return null;
    if (wordsIn(forIt) > DEPTH_MAX_WORDS || wordsIn(against) > DEPTH_MAX_WORDS) return null;
    if (checkMemoCitations(`${forIt} ${against} ${argument}`, `${own}\n${theirWords}`).length > 0) return null;
    // The paragraph is optional to the analysis; a bad one only costs the quick statement.
    const usable =
      argument.trim() &&
      wordsIn(argument) <= ARGUMENT_MAX_WORDS &&
      checkNoCaseCitation([argument]) &&
      periodsAreTheirs(argument, theirWords);
    return { for: forIt.trim(), against: against.trim(), argument: usable ? argument.trim() : "" };
  }
}

const wordsIn = (x: string) => x.split(/\s+/).filter(Boolean).length;

interface Point {
  id: string;
  kind: "ground" | "criterion";
  /** The criterion's own words; for a ground, its id. */
  text: string;
  /** How it is headed in their document — the analysis's own name for it. */
  heading: string;
}
interface Worked {
  for: string;
  against: string;
  argument: string;
}

/**
 * The points the person marked, in the order they marked them: the grounds on judicial review;
 * otherwise the criteria they ticked, or every criterion for the path when they ticked none (as
 * the analysis always worked through). At most seven.
 */
function pointsFor(body: z.infer<typeof BodySchema>): Point[] {
  if (body.pathId === "judicial-review") {
    return body.groundIds.flatMap((id) => {
      const g = getGround(id);
      if (!g) return [];
      const heading = `${g.name} — ${g.plainName.charAt(0).toLowerCase()}${g.plainName.slice(1)}`;
      return [{ id, kind: "ground" as const, text: id, heading }];
    }).slice(0, 7);
  }
  const all = withCriterionIds(body.criteria);
  const picked = all.filter((c) => body.pickedCriteria.includes(c.text));
  return (picked.length ? picked : all)
    .map((c) => ({ id: c.id, kind: "criterion" as const, text: c.text, heading: inMyVoice(c.text) }))
    .slice(0, 7);
}
