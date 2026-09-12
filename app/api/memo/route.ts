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

const BodySchema = z.object({
  entryId: z.string().min(1).max(64),
  pathId: z.enum(["internal-review", "merits-review", "judicial-review"]),
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

  const proc =
    body.pathId === "internal-review"
      ? null
      : getProcess(body.pathId === "judicial-review" ? "judicial-review" : "merits-review") ?? null;
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
    ...result.data.application.flatMap((a) => [a.forThem, a.against, a.toTest]),
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
      sources: result.data.sources,
    },
    ctx,
  );
}
