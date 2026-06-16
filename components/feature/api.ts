"use client";

import type { EntrySummary } from "@/lib/corpus/summary";
import type { GeneratedAnswer, GeneratedDecode } from "@/lib/schemas/generation";
import type { DeadlineResult } from "@/lib/deadline/compute";
import type { Draft } from "@/lib/draft/build";
import type { HelpService } from "@/lib/schemas/corpus";

const BYO_HEADER = "x-byo-anthropic-key";

function headers(byoKey?: string): HeadersInit {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (byoKey) h[BYO_HEADER] = byoKey;
  return h;
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

export async function postAsk(question: string, byoKey?: string): Promise<AskResponse> {
  const res = await fetch("/api/ask", {
    method: "POST",
    headers: headers(byoKey),
    body: JSON.stringify({ question, locale: "en" }),
    cache: "no-store",
  });
  return res.json();
}

export async function postDecodeText(text: string, byoKey?: string): Promise<DecodeResponse> {
  const res = await fetch("/api/decode", {
    method: "POST",
    headers: headers(byoKey),
    body: JSON.stringify({ text, locale: "en" }),
    cache: "no-store",
  });
  return res.json();
}

export async function postDecodeFile(file: File, byoKey?: string): Promise<DecodeResponse> {
  const form = new FormData();
  form.append("file", file);
  const h: Record<string, string> = {};
  if (byoKey) h[BYO_HEADER] = byoKey;
  const res = await fetch("/api/decode", { method: "POST", headers: h, body: form, cache: "no-store" });
  return res.json();
}

export async function postDeadline(
  entryId: string,
  pathwayName: string,
  decisionDate: string,
): Promise<DeadlineResponse> {
  const res = await fetch("/api/deadline", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ entryId, pathwayName, decisionDate }),
    cache: "no-store",
  });
  return res.json();
}

export async function postDraft(
  entryId: string,
  kind: "reasons-request" | "review-application",
  context?: string,
): Promise<DraftResponse> {
  const res = await fetch("/api/draft", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ entryId, kind, context, locale: "en" }),
    cache: "no-store",
  });
  return res.json();
}
