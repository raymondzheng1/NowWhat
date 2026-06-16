import type { NextRequest } from "next/server";
import { DecodeTextRequestSchema } from "@/lib/schemas/api";
import { getRequestContext } from "@/lib/http/request-context";
import { apiJson } from "@/lib/http/respond";
import { precheck } from "@/lib/cost/guard";
import { runOcr } from "@/lib/intake/ocr";
import { classifyForDecode, getEntry, FALLBACK_ENTRY_ID } from "@/lib/corpus/index";
import { buildContext } from "@/lib/retrieval/select";
import { runDecode } from "@/lib/generation/runner";
import { isModelConfigured } from "@/lib/generation/anthropic";
import { toEntrySummary } from "@/lib/corpus/summary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

/**
 * Decode a letter (PRD §6.2/§6.3). The letter is OCR'd + processed IN MEMORY and
 * DISCARDED — never stored, never logged, never returned in the response.
 */
export async function POST(req: NextRequest) {
  const ctx = getRequestContext(req);

  // --- Obtain letter text (paste or in-memory OCR). ---
  let letterText = "";
  const contentType = req.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const pasted = form.get("text");
      if (typeof pasted === "string" && pasted.trim()) {
        letterText = pasted.trim();
      } else {
        const file = form.get("file");
        if (file instanceof File) {
          if (file.size > MAX_UPLOAD_BYTES) {
            return apiJson({ ok: false, status: "error", message: "errors.badInput" }, ctx, 413);
          }
          const bytes = new Uint8Array(await file.arrayBuffer());
          const ocr = await runOcr(bytes);
          if (!ocr.available) {
            return apiJson({ ok: true, status: "ocr-unavailable" }, ctx);
          }
          letterText = (ocr.text ?? "").trim();
        }
      }
    } else {
      const parsed = DecodeTextRequestSchema.safeParse(await req.json());
      if (!parsed.success) {
        return apiJson({ ok: false, status: "error", message: "errors.badInput" }, ctx, 400);
      }
      letterText = parsed.data.text;
    }
  } catch {
    return apiJson({ ok: false, status: "error", message: "errors.badInput" }, ctx, 400);
  }

  if (letterText.length < 10) {
    return apiJson({ ok: false, status: "error", message: "errors.badInput" }, ctx, 400);
  }

  // No model configured → nothing to meter. Classify (deterministic) so we can route to
  // the right help, and degrade gracefully instead of failing closed on the cost guard.
  if (!isModelConfigured()) {
    const match = classifyForDecode(letterText);
    const help = (match ? getEntry(match.entryId) : getEntry(FALLBACK_ENTRY_ID))?.getHelp ?? [];
    return apiJson({ ok: true, status: "not-covered", getHelp: help }, ctx);
  }

  // --- Cost guard before any model call (fail-closed). ---
  const guard = await precheck(ctx.guard);
  if (!guard.allowed) {
    const code = guard.reason === "rate" ? 429 : guard.reason === "unconfigured" || guard.reason === "error" ? 503 : 200;
    return apiJson({ ok: false, status: "blocked", reason: guard.reason, message: guard.message }, ctx, code);
  }

  const match = classifyForDecode(letterText);
  if (!match) {
    return apiJson(
      { ok: true, status: "not-covered", getHelp: getEntry(FALLBACK_ENTRY_ID)?.getHelp ?? [] },
      ctx,
    );
  }
  const entry = getEntry(match.entryId);
  if (!entry) {
    return apiJson({ ok: true, status: "not-covered", getHelp: [] }, ctx);
  }

  let result;
  try {
    result = await runDecode({
      entry,
      context: buildContext(entry),
      userInput: letterText,
      guard: ctx.guard,
      byoKeyValue: ctx.byoKeyValue,
    });
  } catch {
    // Provider/network error — degrade to honest help; letter still discarded.
    return apiJson({ ok: true, status: "not-covered", getHelp: entry.getHelp }, ctx);
  }
  // letterText goes out of scope here — never persisted.

  if (result.status !== "answered" || !result.data) {
    return apiJson(
      { ok: true, status: "not-covered", getHelp: entry.getHelp },
      ctx,
    );
  }

  return apiJson(
    {
      ok: true,
      status: "answered",
      decode: result.data,
      entry: toEntrySummary(entry),
      isFallback: match.isFallback,
    },
    ctx,
  );
}
