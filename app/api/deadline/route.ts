import type { NextRequest } from "next/server";
import { DeadlineRequestSchema } from "@/lib/schemas/api";
import { getRequestContext } from "@/lib/http/request-context";
import { apiJson } from "@/lib/http/respond";
import { getEntry } from "@/lib/corpus/index";
import { computeDeadline } from "@/lib/deadline/compute";
import { buildReminderIcs } from "@/lib/deadline/ics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Deadline computation (PRD §6.4). Deterministic — no model call. A concrete date is
 * only ever returned when the pathway's deadline is verified + sourced; otherwise an
 * honest "a time limit applies — confirm it" result (never an unsourced figure).
 */
export async function POST(req: NextRequest) {
  const ctx = getRequestContext(req);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiJson({ ok: false, message: "errors.badInput" }, ctx, 400);
  }
  const parsed = DeadlineRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiJson({ ok: false, message: "errors.badInput" }, ctx, 400);
  }

  const entry = getEntry(parsed.data.entryId);
  if (!entry) return apiJson({ ok: false, message: "errors.badInput" }, ctx, 400);

  const result = computeDeadline(entry, parsed.data.pathwayName, parsed.data.decisionDate);
  if (!result) return apiJson({ ok: false, message: "errors.badInput" }, ctx, 400);

  let ics: string | undefined;
  if (result.renderable) {
    ics = buildReminderIcs({
      deadlineDate: result.deadlineDate,
      title: `Time limit: ${result.pathwayName}`,
      description: "A time limit to act on a government decision. General information only — talk to a free legal service for advice.",
    });
  }

  return apiJson({ ok: true, deadline: result, ics }, ctx);
}
