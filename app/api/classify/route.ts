import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRequestContext } from "@/lib/http/request-context";
import { apiJson } from "@/lib/http/respond";
import { classifyForDecode } from "@/lib/corpus/index";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ text: z.string().trim().min(5).max(20000) });

/**
 * Model-free classification for the wizard's "paste my letter" path. Deterministic —
 * matches letter text to a corpus entry (no model call, no cost). The text is treated
 * as DATA, processed in memory, and never stored or returned.
 */
export async function POST(req: NextRequest) {
  const ctx = getRequestContext(req);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiJson({ ok: false, message: "errors.badInput" }, ctx, 400);
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return apiJson({ ok: false, message: "errors.badInput" }, ctx, 400);

  const match = classifyForDecode(parsed.data.text);
  if (!match) return apiJson({ ok: true, status: "not-covered" }, ctx);
  return apiJson(
    { ok: true, status: "matched", entryId: match.entryId, isFallback: match.isFallback },
    ctx,
  );
}
