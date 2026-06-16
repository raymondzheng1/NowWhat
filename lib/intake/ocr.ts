/**
 * OCR (PRD §6.2, TECHNICAL_SPEC §8). Image/PDF bytes are processed IN MEMORY and never
 * written to disk or logged. Provider-pluggable:
 *  - default: the configured vision model (Anthropic) — transcription only; the same
 *    trust boundary as the decode call, metered by the same cost guard.
 *  - OCR_PROVIDER=gcv + OCR_API_KEY: Google Cloud Vision.
 *  - OCR_PROVIDER=none, or no model + no GCV key: disabled (the paste path always works).
 */

import { callVision, isModelConfigured } from "@/lib/generation/anthropic";
import { MODELS } from "@/lib/config";

export interface OcrResult {
  available: boolean;
  text?: string;
  /** Token usage when an LLM provider transcribed the image (for the cost meter). */
  inputTokens?: number;
  outputTokens?: number;
  model?: string;
}

export type OcrProvider = "anthropic" | "gcv" | "none";

export function ocrProvider(): OcrProvider {
  const p = process.env.OCR_PROVIDER;
  if (p === "none") return "none";
  if (p === "gcv" && process.env.OCR_API_KEY) return "gcv";
  // Default: transcribe with the vision model when one is configured.
  return isModelConfigured() ? "anthropic" : "none";
}

export function ocrEnabled(): boolean {
  return ocrProvider() !== "none";
}

// Transcription only — never summarise/decode here (that is the grounded decode step).
const TRANSCRIBE_PROMPT =
  "You are a transcription tool for an accessibility service. Output ONLY the exact text visible in this document, verbatim, keeping line breaks. Do not summarise, explain, translate, infer, or add anything. If there is no readable text, output nothing.";

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

async function anthropicOcr(bytes: Uint8Array, mediaType: string): Promise<OcrResult> {
  const r = await callVision({
    bytes,
    mediaType,
    prompt: TRANSCRIBE_PROMPT,
    model: MODELS.primary,
    maxTokens: 1500,
  });
  return {
    available: true,
    text: r.text.trim(),
    inputTokens: r.inputTokens,
    outputTokens: r.outputTokens,
    model: r.model,
  };
}

async function gcvOcr(bytes: Uint8Array): Promise<OcrResult> {
  const key = process.env.OCR_API_KEY as string;
  const res = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [
        { image: { content: toBase64(bytes) }, features: [{ type: "DOCUMENT_TEXT_DETECTION" }] },
      ],
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) return { available: true, text: "" };
  const data = (await res.json()) as {
    responses?: { fullTextAnnotation?: { text?: string } }[];
  };
  return { available: true, text: data.responses?.[0]?.fullTextAnnotation?.text ?? "" };
}

/**
 * Run OCR on image/PDF bytes held in memory. `available:false` means no provider is
 * configured (the caller should ask the person to paste the text instead).
 */
export async function runOcr(bytes: Uint8Array, mediaType: string): Promise<OcrResult> {
  const provider = ocrProvider();
  if (provider === "none") return { available: false };
  try {
    if (provider === "gcv") return await gcvOcr(bytes);
    return await anthropicOcr(bytes, mediaType);
  } catch {
    // Provider/network/format error — never expose internals; treat as unreadable.
    return { available: true, text: "" };
  }
}
