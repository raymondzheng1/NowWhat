import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRequestContext } from "@/lib/http/request-context";
import { apiJson } from "@/lib/http/respond";
import { precheck } from "@/lib/cost/guard";
import { getDataEntry } from "@/lib/data";
import { getEntry, FALLBACK_ENTRY_ID } from "@/lib/corpus/index";
import { getConcept, getGround, getProcess } from "@/lib/legal";
import { runMemo } from "@/lib/generation/runner";
import { isModelConfigured } from "@/lib/generation/anthropic";
import { buildMemoContext, memoExtraSources } from "@/lib/memo/context";
import { answerableCriteria } from "@/lib/memo/criteria";
import { checkMemoCitations } from "@/lib/memo/qa";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Draft the application section of a person's memo.
 *
 * THIS IS THE ONE STEP IN /start THAT LEAVES THE DEVICE, and it exists because the memo is
 * the product: everything before it gathers what a person knows, and this is where that turns
 * into something a duty lawyer can read in two minutes. The rest of the flow still computes
 * on-device and still sends nothing.
 *
 * What that costs, and what protects it:
 *   · The request carries the person's own words. It is processed IN MEMORY and discarded on
 *     response — never stored, never logged, never echoed back into the response body. There
 *     is no database here to store it in.
 *   · The model is given ONLY our knowledge base (`buildMemoContext`) plus their words. It
 *     cannot reach anything else, which is the owner's rule: our analysis and our legal
 *     sources come from our own corpus and nowhere else.
 *   · The model writes the APPLICATION only. Every test, case, remedy and time-limit rule is
 *     copied verbatim by `composeMemo`, so there is nothing there for it to get wrong.
 *   · Output passes `verifyOutput` (no advice, no prediction, no out-of-corpus fact,
 *     source-binding, jurisdiction, reading level) and then `checkMemoCitations`, which
 *     rejects any case, Act or section the context did not supply.
 *   · ANY failure returns "not-covered". The client then keeps the deterministic memo, which
 *     needs no model at all — so a rejected draft costs the person nothing, and the app is
 *     never worse than it was before this route existed.
 */

/**
 * Output budget for one memo, from the number of points and the parts of their tests.
 * Capped, so a request that marks every ground cannot ask for an unbounded answer.
 */
function memoTokenBudget(grounds: { elements: unknown[] }[], criteria: number): number {
  const parts = grounds.reduce((n, g) => n + g.elements.length, 0);
  return Math.min(8000, 1200 + 300 * grounds.length + 220 * parts + 220 * criteria);
}

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
    result = await runMemo({
      entry: verifyEntry,
      context,
      userInput: theirWords,
      guard: ctx.guard,
      byoKeyValue: ctx.byoKeyValue,
      extraSources: memoExtraSources({ entry, process: proc, internal, grounds }),
      // ROOM FOR THE ANSWER, sized to what was actually asked for. The memo is the only
      // output whose length follows its input: three paragraphs for each point the person
      // marked, plus two short lines for each part of each point's test. The shared 1200
      // was enough for one point and not for two, and going over does not produce a shorter
      // memo — it produces half a JSON object, which fails to parse and ends as "not
      // covered". Billing is on tokens USED, so a ceiling that is never reached costs
      // nothing; the only thing a low one buys is a silently missing analysis.
      maxTokens: memoTokenBudget(grounds, answerableCriteria(entry, body.criteria).length),
    });
  } catch {
    return notCovered();
  }
  // `theirWords` and `body` go out of scope here. Nothing is written anywhere.

  if (result.status !== "answered" || !result.data) return notCovered();

  // The memo's own gate, on top of the shared ones: a citation that did not come from our
  // knowledge base never ships, even if it happens to name a real case.
  const drafted = [
    result.data.summary,
    ...result.data.application.flatMap((a) => [
      a.forThem,
      a.against,
      a.toTest,
      // The per-element lines too. A fabricated case is no less dangerous for being written
      // under one part of a test instead of under the whole of it.
      ...a.elements.flatMap((e) => [e.says, e.missing]),
    ]),
    // And the per-criterion lines. This is the only drafted analysis most people will see —
    // an internal review and a tribunal have no grounds — so leaving it out of the citation
    // scan would exempt the common case and gate the rare one.
    ...result.data.criteria.flatMap((c) => [c.says, c.missing]),
  ].join("\n");
  const invented = checkMemoCitations(drafted, `${context}\n${entry.deadlineRule}`);
  if (invented.length > 0) return notCovered();

  if (!result.data.covered) return notCovered();

  return apiJson(
    {
      ok: true,
      status: "answered" as const,
      summary: result.data.summary,
      application: result.data.application,
      criteria: result.data.criteria,
      sources: result.data.sources,
    },
    ctx,
  );
}
