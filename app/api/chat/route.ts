import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRequestContext } from "@/lib/http/request-context";
import { apiJson } from "@/lib/http/respond";
import { precheck } from "@/lib/cost/guard";
import { isModelConfigured } from "@/lib/generation/anthropic";
import { runChatTurn, type ChatMessage } from "@/lib/chat/runner";
import { redactPii } from "@/lib/chat/redact";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(4000) }))
    .min(1)
    .max(40),
});

/**
 * Conversational intake (PRD §5; harness §11.3). Stateless — the client holds the
 * conversation; nothing is stored. Cost-guarded; replies are gated grounded-or-silent +
 * no-advice in the runner. Degrades gracefully when no model is configured.
 */
export async function POST(req: NextRequest) {
  const ctx = getRequestContext(req);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiJson({ ok: false, status: "error", message: "errors.badInput" }, ctx, 400);
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return apiJson({ ok: false, status: "error", message: "errors.badInput" }, ctx, 400);
  }

  if (!isModelConfigured()) {
    return apiJson(
      {
        ok: true,
        status: "unavailable",
        reply:
          "The chat isn't available right now. You can still work out your options with the step-by-step guide, or see free help.",
        area: null,
        decisionDate: null,
        handoff: false,
      },
      ctx,
    );
  }

  const guard = await precheck(ctx.guard);
  if (!guard.allowed) {
    const code = guard.reason === "rate" ? 429 : guard.reason === "unconfigured" || guard.reason === "error" ? 503 : 200;
    return apiJson({ ok: false, status: "blocked", reason: guard.reason, message: guard.message }, ctx, code);
  }

  // Redact high-risk numbers from user turns before they reach the model. Never stored.
  const messages: ChatMessage[] = parsed.data.messages.map((m) =>
    m.role === "user" ? { role: m.role, content: redactPii(m.content) } : m,
  );

  try {
    const turn = await runChatTurn({ messages, guard: ctx.guard, byoKeyValue: ctx.byoKeyValue });
    return apiJson({ ok: true, status: "ok", ...turn }, ctx);
  } catch {
    return apiJson(
      {
        ok: true,
        status: "ok",
        reply: "Something went wrong on my end. You can use the step-by-step guide, or see free help.",
        area: null,
        decisionDate: null,
        handoff: false,
      },
      ctx,
    );
  }
}
