import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { z } from "zod";
import { getRequestContext } from "@/lib/http/request-context";
import { apiJson } from "@/lib/http/respond";
import { precheck, record, estimateCostUsd } from "@/lib/cost/guard";
import { isModelConfigured, callModel } from "@/lib/generation/anthropic";
import { systemPrompt, userPrompt } from "@/lib/generation/prompts";
import { MODELS } from "@/lib/config";
import { getEntry } from "@/lib/corpus/index";
import { getGround } from "@/lib/legal";
import { LetterSelectionSchema, screenSelection, retryHintFor } from "@/lib/letter/select";
import { looksThirdParty } from "@/lib/verification/own-words";
import { sendQaCopy } from "@/lib/email/qa";

/**
 * Puts the person's own words under the headings they marked.
 *
 * This is the only route in the product that receives a person's free-text account of their
 * own government matter. Everything about it is shaped by that:
 *   · the model may only SELECT their words, never add (lib/verification/own-words.ts);
 *   · every returned item is screened against its own quote and DROPPED if it fails;
 *   · the account is never stored, never logged, and never echoed into a retry prompt;
 *   · the deterministic letter already exists on the page, so every failure path here is a
 *     degradation to something that still works, never a blank screen.
 */
const Body = z.object({
  entryId: z.string().min(1),
  account: z.string().trim().min(20).max(6000),
  groundIds: z.array(z.string()).max(15).default([]),
});

const MAX_ATTEMPTS = 2;

export async function POST(req: NextRequest) {
  const ctx = getRequestContext(req);
  const bad = () => apiJson({ ok: false, status: "error", message: "errors.badInput" }, ctx, 400);

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return bad();
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return bad();
  const { entryId, account, groundIds } = parsed.data;

  const entry = getEntry(entryId);
  if (!entry) return apiJson({ ok: true, status: "unavailable" }, ctx);

  // "I" is a connective, so an account written for someone else converts to first person past
  // every word gate. Refuse before the call rather than produce a letter in the wrong voice.
  if (looksThirdParty(account)) {
    return apiJson({ ok: true, status: "third-party" }, ctx);
  }

  // No model, or the cap is reached: the person keeps the deterministic letter already on
  // screen. Nothing here may ever leave them worse off than before they pressed the button.
  if (!isModelConfigured()) return apiJson({ ok: true, status: "unavailable" }, ctx);

  const guard = await precheck(ctx.guard);
  if (!guard.allowed) {
    const code =
      guard.reason === "rate" ? 429 : guard.reason === "unconfigured" || guard.reason === "error" ? 503 : 200;
    return apiJson({ ok: false, status: "blocked", reason: guard.reason, message: guard.message }, ctx, code);
  }

  // Only the marked grounds, and only what the model needs to recognise them. Deliberately
  // NOT included: leadingCases (a citation must never reach a letter) and `test` (the legal
  // standard is what we are keeping out of the person's mouth).
  const marked = groundIds.map((id) => getGround(id)).filter(Boolean);
  const context = marked
    .map((g) =>
      [
        `POINT ${g!.id}`,
        `Heading already in the letter: ${g!.plainName}`,
        `Usually about: ${g!.oneLine}`,
        `Not about: ${g!.whatItIsNot}`,
      ].join("\n"),
    )
    .join("\n\n");

  let hint: string | undefined;
  let lastGates: string[] = [];
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let res;
    try {
      res = await callModel({
        system: systemPrompt("letter"),
        user: userPrompt("letter", context, account, hint),
        model: MODELS.primary,
        maxTokens: 1600,
        byoKeyValue: ctx.byoKeyValue,
      });
    } catch {
      return apiJson({ ok: true, status: "unavailable" }, ctx);
    }
    await record(ctx.guard, estimateCostUsd(res.model, res.inputTokens, res.outputTokens));

    let data: unknown;
    try {
      data = JSON.parse(res.text.replace(/^```(?:json)?|```$/gm, "").trim());
    } catch {
      hint = "return a single JSON object and nothing else";
      continue;
    }
    const shape = LetterSelectionSchema.safeParse(data);
    if (!shape.success) {
      hint = "return a single JSON object and nothing else";
      continue;
    }

    const screened = screenSelection(shape.data, account, groundIds);
    lastGates = screened.droppedGates;
    if (screened.points.length > 0) {
      sendQaCopy("draft", {
        "Their account": account,
        "Points marked": groundIds.join(", "),
        Kept: screened.points
          .map((p) => `${p.groundId}: ${p.sentences.map((s) => s.text).join(" | ")}`)
          .join("\n"),
        "Gates that dropped something": screened.droppedGates.join(", ") || "(none)",
      });
      return apiJson({ ok: true, status: "ready", points: screened.points }, ctx);
    }
    // Nothing survived. Tell the next attempt WHAT to change — gate names only, never a word
    // of the person's text, which would put their data back into a prompt.
    hint = retryHintFor(screened.droppedGates);
  }

  sendQaCopy("draft", {
    "Their account": account,
    "Points marked": groundIds.join(", "),
    Kept: "(nothing survived the gates)",
    "Gates that dropped something": lastGates.join(", ") || "(none)",
  });
  return apiJson({ ok: true, status: "nothing-usable", gates: lastGates }, ctx);
}
