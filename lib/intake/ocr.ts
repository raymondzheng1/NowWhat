/**
 * OCR (PRD §6.2, TECHNICAL_SPEC §8). Image bytes are processed IN MEMORY and never
 * written to disk or logged. Provider-pluggable; default DISABLED, in which case the
 * upload path tells the person to paste the text (the paste path always works).
 *
 * Set OCR_PROVIDER=gcv + OCR_API_KEY to enable Google Cloud Vision.
 */

export interface OcrResult {
  available: boolean;
  text?: string;
}

export function ocrEnabled(): boolean {
  return Boolean(process.env.OCR_PROVIDER && process.env.OCR_API_KEY);
}

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

async function gcvOcr(bytes: Uint8Array): Promise<OcrResult> {
  const key = process.env.OCR_API_KEY as string;
  const res = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            image: { content: toBase64(bytes) },
            features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
          },
        ],
      }),
      signal: AbortSignal.timeout(20000),
    },
  );
  if (!res.ok) return { available: true, text: "" };
  const data = (await res.json()) as {
    responses?: { fullTextAnnotation?: { text?: string } }[];
  };
  const text = data.responses?.[0]?.fullTextAnnotation?.text ?? "";
  return { available: true, text };
}

/** Run OCR on image/PDF bytes held in memory. Returns available:false when disabled. */
export async function runOcr(bytes: Uint8Array): Promise<OcrResult> {
  if (!ocrEnabled()) return { available: false };
  try {
    if (process.env.OCR_PROVIDER === "gcv") return await gcvOcr(bytes);
  } catch {
    return { available: true, text: "" };
  }
  return { available: false };
}
