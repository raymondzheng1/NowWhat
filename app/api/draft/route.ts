import type { NextRequest } from "next/server";
import { DraftRequestSchema } from "@/lib/schemas/api";
import { getRequestContext } from "@/lib/http/request-context";
import { apiJson } from "@/lib/http/respond";
import { getEntry } from "@/lib/corpus/index";
import { buildDraft } from "@/lib/draft/build";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Draft a starting letter (PRD §6.6). Deterministic template from the corpus — no model
 * call (no cost, no advice risk). The draft is in the person's own voice and is never
 * filed for them. Their optional context is their own words, echoed back verbatim.
 */
export async function POST(req: NextRequest) {
  const ctx = getRequestContext(req);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiJson({ ok: false, message: "errors.badInput" }, ctx, 400);
  }
  const parsed = DraftRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiJson({ ok: false, message: "errors.badInput" }, ctx, 400);
  }

  const entry = getEntry(parsed.data.entryId);
  if (!entry) return apiJson({ ok: false, message: "errors.badInput" }, ctx, 400);

  const draft = buildDraft(entry, parsed.data.kind, parsed.data.context);
  return apiJson({ ok: true, draft }, ctx);
}
