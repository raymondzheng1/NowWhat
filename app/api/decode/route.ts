import type { NextRequest } from "next/server";
import { DecodeTextRequestSchema } from "@/lib/schemas/api";
import { getRequestContext } from "@/lib/http/request-context";
import { apiJson } from "@/lib/http/respond";
import { precheck, record, estimateCostUsd } from "@/lib/cost/guard";
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
 * Decode a letter (PRD §6.2/§6.3). A pasted text or an uploaded photo/PDF is processed
 * IN MEMORY and DISCARDED — never stored, never logged, never returned in the response.
 * A photo is transcribed by OCR (after the cost guard, so it's metered) and the text
 * then flows through the same grounded decode pipeline as pasted text.
 */
export async function POST(req: NextRequest) {
  const ctx = getRequestContext(req);
  const badInput = (code = 400) =>
    apiJson({ ok: false, status: "error", message: "errors.badInput" }, ctx, code);

  // --- Read raw inputs (paste text and/or an uploaded file) into memory. ---
  let pastedText = "";
  let file: File | null = null;
  const contentType = req.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const pasted = form.get("text");
      if (typeof pasted === "string") pastedText = pasted.trim();
      const f = form.get("file");
      if (f instanceof File) file = f;
    } else {
      const parsed = DecodeTextRequestSchema.safeParse(await req.json());
      if (!parsed.success) return badInput();
      pastedText = parsed.data.text;
    }
  } catch {
    return badInput();
  }

  if (!pastedText && !file) return badInput();
  if (file && file.size > MAX_UPLOAD_BYTES) return badInput(413);

  // Decode needs the model. With none configured, degrade gracefully (no spend, no OCR).
  if (!isModelConfigured()) {
    const match = pastedText.length >= 10 ? classifyForDecode(pastedText) : null;
    const help = (match ? getEntry(match.entryId) : getEntry(FALLBACK_ENTRY_ID))?.getHelp ?? [];
    return apiJson({ ok: true, status: "not-covered", getHelp: help }, ctx);
  }

  // --- Cost guard FIRST (gates both OCR and decode spend; fail-closed). ---
  const guard = await precheck(ctx.guard);
  if (!guard.allowed) {
    const code = guard.reason === "rate" ? 429 : guard.reason === "unconfigured" || guard.reason === "error" ? 503 : 200;
    return apiJson({ ok: false, status: "blocked", reason: guard.reason, message: guard.message }, ctx, code);
  }

  // --- Obtain the letter text: prefer pasted text; else OCR the image in memory. ---
  let letterText = pastedText;
  if (!letterText && file) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const ocr = await runOcr(bytes, file.type || "image/png");
    if (!ocr.available) return apiJson({ ok: true, status: "ocr-unavailable" }, ctx);
    if (typeof ocr.inputTokens === "number" && ocr.model) {
      await record(ctx.guard, estimateCostUsd(ocr.model, ocr.inputTokens, ocr.outputTokens ?? 0));
    }
    letterText = (ocr.text ?? "").trim();
    // `bytes` goes out of scope here — the image is never persisted.
  }

  if (letterText.length < 10) {
    // From a photo → we couldn't read it (ask to paste); from text → bad input.
    return file ? apiJson({ ok: true, status: "ocr-unavailable" }, ctx) : badInput();
  }

  const match = classifyForDecode(letterText);
  if (!match) {
    return apiJson(
      { ok: true, status: "not-covered", getHelp: getEntry(FALLBACK_ENTRY_ID)?.getHelp ?? [] },
      ctx,
    );
  }
  const entry = getEntry(match.entryId);
  if (!entry) return apiJson({ ok: true, status: "not-covered", getHelp: [] }, ctx);

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
    return apiJson({ ok: true, status: "not-covered", getHelp: entry.getHelp }, ctx);
  }
  // letterText goes out of scope here — never persisted.

  if (result.status !== "answered" || !result.data) {
    return apiJson({ ok: true, status: "not-covered", getHelp: entry.getHelp }, ctx);
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
