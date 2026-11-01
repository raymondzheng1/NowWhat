import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRequestContext } from "@/lib/http/request-context";
import { apiJson } from "@/lib/http/respond";
import { precheck } from "@/lib/cost/guard";
import { isModelConfigured } from "@/lib/generation/anthropic";
import { runGroundMatch } from "@/lib/generation/runner";
import { getEntry, FALLBACK_ENTRY_ID } from "@/lib/corpus/index";
import { getGround } from "@/lib/legal";
import { screenMatches } from "@/lib/grounds/match";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Room for a slow model call and its retries to finish rather than be cut off (2026-11-02).
export const maxDuration = 300;

/**
 * Which of the offered grounds the person's account may relate to, and why — a first cut.
 *
 * Like every route that reads an account: never stored, never logged, never echoed into a
 * retry. Every failure path is the page as it was before this existed — the full list with
 * nothing suggested — so it can only ever add help, never take the list away.
 */
const Body = z.object({
  entryId: z.string().min(1).max(64),
  account: z.string().trim().min(20).max(8000),
  groundIds: z.array(z.string().max(64)).min(1).max(20),
});

export async function POST(req: NextRequest) {
  const ctx = getRequestContext(req);
  const none = (gates: string[] = []) =>
    apiJson({ ok: true, status: "none" as const, ...(gates.length ? { gates } : {}) }, ctx);

  let body: z.infer<typeof Body>;
  try {
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return apiJson({ ok: false, status: "error", message: "errors.badInput" }, ctx, 400);
    body = parsed.data;
  } catch {
    return apiJson({ ok: false, status: "error", message: "errors.badInput" }, ctx, 400);
  }

  if (!isModelConfigured()) return none();

  const grounds = body.groundIds.map((id) => getGround(id)).filter((g): g is NonNullable<typeof g> => !!g);
  if (grounds.length === 0) return none();

  const guard = await precheck(ctx.guard);
  if (!guard.allowed) {
    const code =
      guard.reason === "rate" ? 429 : guard.reason === "unconfigured" || guard.reason === "error" ? 503 : 200;
    return apiJson({ ok: false, status: "blocked", reason: guard.reason, message: guard.message }, ctx, code);
  }

  // What each ground is usually about, in the corpus's plain words. Deliberately NOT the legal
  // test or the cases: the cut is about the person's facts, and the page prints the law.
  const context = [
    "GROUNDS",
    ...grounds.map((g) =>
      [
        `GROUND ${g.id}`,
        `Name: ${g.plainName}`,
        `Usually about: ${g.oneLine}`,
        `Situations that may relate: ${g.whatRelates.join("; ")}`,
        g.whatItIsNot ? `Not about: ${g.whatItIsNot}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    ),
  ].join("\n\n");

  const verifyEntry = getEntry(body.entryId) ?? getEntry(FALLBACK_ENTRY_ID);
  if (!verifyEntry) return none();

  let result;
  try {
    result = await runGroundMatch({
      entry: verifyEntry,
      context,
      userInput: body.account,
      guard: ctx.guard,
      byoKeyValue: ctx.byoKeyValue,
      maxTokens: 1200,
      groundedText: context,
      accountText: body.account,
    });
  } catch {
    return none(["unavailable"]);
  }
  if (result.status !== "answered" || !result.data) return none(result.rejectedGates ?? []);

  const { suggestions, dropped } = screenMatches(
    result.data,
    body.account,
    grounds.map((g) => g.id),
  );
  return apiJson(
    { ok: true, status: "ready" as const, suggestions, ...(dropped.length ? { gates: dropped } : {}) },
    ctx,
  );
}
