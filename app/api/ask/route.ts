import type { NextRequest } from "next/server";
import { AskRequestSchema } from "@/lib/schemas/api";
import { getRequestContext } from "@/lib/http/request-context";
import { apiJson } from "@/lib/http/respond";
import { precheck } from "@/lib/cost/guard";
import { retrieveForAsk, buildContext } from "@/lib/retrieval/select";
import { runAsk } from "@/lib/generation/runner";
import { getEntry, FALLBACK_ENTRY_ID } from "@/lib/corpus/index";
import { toEntrySummary } from "@/lib/corpus/summary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Grounded Q&A (PRD §6.5). Cost-guarded, verified, grounded-or-silent. */
export async function POST(req: NextRequest) {
  const ctx = getRequestContext(req);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiJson({ ok: false, status: "error", message: "errors.badInput" }, ctx, 400);
  }
  const parsed = AskRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiJson({ ok: false, status: "error", message: "errors.badInput" }, ctx, 400);
  }

  // Cost guard FIRST (fail-closed), before any model call.
  const guard = await precheck(ctx.guard);
  if (!guard.allowed) {
    const code = guard.reason === "rate" ? 429 : guard.reason === "unconfigured" || guard.reason === "error" ? 503 : 200;
    return apiJson({ ok: false, status: "blocked", reason: guard.reason, message: guard.message }, ctx, code);
  }

  const fallbackHelp = getEntry(FALLBACK_ENTRY_ID);
  const retrieved = retrieveForAsk(parsed.data.question);
  if (!retrieved) {
    return apiJson(
      {
        ok: true,
        status: "not-covered",
        getHelp: fallbackHelp?.getHelp ?? [],
      },
      ctx,
    );
  }

  let result;
  try {
    result = await runAsk({
      entry: retrieved.entry,
      context: buildContext(retrieved.entry),
      userInput: parsed.data.question,
      guard: ctx.guard,
      byoKeyValue: ctx.byoKeyValue,
    });
  } catch {
    // Provider/network error — never expose internals; degrade to honest help.
    return apiJson(
      { ok: true, status: "not-covered", getHelp: retrieved.entry.getHelp ?? fallbackHelp?.getHelp ?? [] },
      ctx,
    );
  }

  if (result.status !== "answered" || !result.data) {
    return apiJson(
      {
        ok: true,
        status: "not-covered",
        getHelp: (retrieved.entry.getHelp.length ? retrieved.entry : fallbackHelp)?.getHelp ?? [],
      },
      ctx,
    );
  }

  return apiJson(
    {
      ok: true,
      status: "answered",
      answer: result.data,
      entry: toEntrySummary(retrieved.entry),
    },
    ctx,
  );
}
