"use client";

import type { EntrySummary } from "@/lib/corpus/summary";
import type { GeneratedAnswer, GeneratedDecode } from "@/lib/schemas/generation";
import type { DeadlineResult } from "@/lib/deadline/compute";
import type { Draft } from "@/lib/draft/build";
import type { HelpService } from "@/lib/schemas/corpus";

function headers(): HeadersInit {
  return { "Content-Type": "application/json" };
}

/**
 * Every call gets a deadline. On a phone that drops to one bar mid-request there is no
 * error and no response — the person sits behind the blocking overlay indefinitely, which
 * is the worst possible failure for someone already frightened. A timed-out call surfaces
 * as a normal error with a route to free help.
 */
const TEXT_TIMEOUT_MS = 30_000;
const UPLOAD_TIMEOUT_MS = 60_000;

export class TimeoutError extends Error {
  constructor() {
    super("timeout");
    this.name = "TimeoutError";
  }
}

async function withTimeout<T>(
  ms: number,
  run: (signal: AbortSignal) => Promise<Response>,
): Promise<T> {
  try {
    const res = await run(AbortSignal.timeout(ms));
    return (await res.json()) as T;
  } catch (e) {
    // Both the native abort reason and a plain AbortError land here.
    if (e instanceof DOMException && (e.name === "TimeoutError" || e.name === "AbortError")) {
      throw new TimeoutError();
    }
    throw e;
  }
}

export type AskResponse =
  | { ok: true; status: "answered"; answer: GeneratedAnswer; entry: EntrySummary }
  | { ok: true; status: "not-covered"; getHelp: HelpService[] }
  | { ok: false; status: "blocked" | "error"; reason?: string; message: string };

export type DecodeResponse =
  | { ok: true; status: "answered"; decode: GeneratedDecode; entry: EntrySummary; isFallback: boolean }
  | { ok: true; status: "not-covered"; getHelp: HelpService[] }
  | { ok: true; status: "ocr-unavailable" }
  | { ok: false; status: "blocked" | "error"; reason?: string; message: string };

export type DeadlineResponse =
  | { ok: true; deadline: DeadlineResult; ics?: string }
  | { ok: false; message: string };

export type DraftResponse = { ok: true; draft: Draft } | { ok: false; message: string };

export type ClassifyResponse =
  | { ok: true; status: "matched"; entryId: string; isFallback: boolean }
  | { ok: true; status: "not-covered" }
  | { ok: false; message: string };

export async function postClassify(text: string): Promise<ClassifyResponse> {
  return withTimeout<ClassifyResponse>(TEXT_TIMEOUT_MS, (signal) =>
    fetch("/api/classify", {
    signal,
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ text }),
    cache: "no-store",
    }),
  );
}

export async function postAsk(question: string): Promise<AskResponse> {
  return withTimeout<AskResponse>(TEXT_TIMEOUT_MS, (signal) =>
    fetch("/api/ask", {
    signal,
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ question, locale: "en" }),
    cache: "no-store",
    }),
  );
}

export async function postDecodeText(text: string): Promise<DecodeResponse> {
  return withTimeout<DecodeResponse>(TEXT_TIMEOUT_MS, (signal) =>
    fetch("/api/decode", {
    signal,
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ text, locale: "en" }),
    cache: "no-store",
    }),
  );
}

export async function postDecodeFile(file: File): Promise<DecodeResponse> {
  const form = new FormData();
  form.append("file", file);
  // Uploads get longer: a photo of a letter over a slow mobile connection is legitimately
  // slower than a text call, but it still must not hang forever.
  return withTimeout<DecodeResponse>(UPLOAD_TIMEOUT_MS, (signal) =>
    fetch("/api/decode", { signal, method: "POST", body: form, cache: "no-store" }),
  );
}

export async function postDeadline(
  entryId: string,
  pathwayName: string,
  decisionDate: string,
): Promise<DeadlineResponse> {
  return withTimeout<DeadlineResponse>(TEXT_TIMEOUT_MS, (signal) =>
    fetch("/api/deadline", {
    signal,
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ entryId, pathwayName, decisionDate }),
    cache: "no-store",
    }),
  );
}

export async function postDraft(
  entryId: string,
  kind: "reasons-request" | "review-application" | "merits-review-application" | "judicial-review-application",
  context?: string,
): Promise<DraftResponse> {
  return withTimeout<DraftResponse>(TEXT_TIMEOUT_MS, (signal) =>
    fetch("/api/draft", {
    signal,
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ entryId, kind, context, locale: "en" }),
    cache: "no-store",
    }),
  );
}
