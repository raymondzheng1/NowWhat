import Anthropic from "@anthropic-ai/sdk";

/**
 * Anthropic access (server-side ONLY — harness §11). Prompt caching on the stable
 * system prompt cuts cost + latency. A test seam lets integration tests inject a fake
 * model so no network/key is needed (harness §4.4).
 */

export interface ModelCall {
  system: string;
  user: string;
  model: string;
  maxTokens: number;
  /** When set, use the user's own key (BYO-key bypass). */
  byoKeyValue?: string;
  /**
   * Which product surface is spending. Lets one surface bill to its own Anthropic key so its
   * cost can be read straight off the Anthropic console instead of being inferred from our own
   * meters. Falls back to the main key whenever the per-surface variable is unset, so nothing
   * breaks by leaving it out.
   */
  surface?: "chat" | "default";
}

export interface ModelResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

export type ModelFn = (call: ModelCall) => Promise<ModelResult>;

let injected: ModelFn | null = null;

/** Test seam — inject a fake model in tests. */
export function __setModelForTests(fn: ModelFn | null): void {
  injected = fn;
}

/**
 * Whether a model is available at all (a real key, or an injected test fake). When false,
 * the model-backed routes degrade gracefully to "here's who can help" rather than failing
 * closed on the cost guard — there is no spend to meter if we never call the model.
 */
export function isModelConfigured(): boolean {
  return injected !== null || Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY_CHAT);
}

/**
 * The key a surface spends against. `chat` is the "Work it out with us" panel, which is
 * open-ended and the hardest surface to cost-forecast, so it gets its own key when one is
 * configured. Everything else uses the main key.
 */
export function keyForSurface(surface: ModelCall["surface"]): string {
  if (surface === "chat" && process.env.ANTHROPIC_API_KEY_CHAT) {
    return process.env.ANTHROPIC_API_KEY_CHAT;
  }
  return process.env.ANTHROPIC_API_KEY ?? "";
}

// One cached client per key, so a second key does not mean a new client on every call.
const clients = new Map<string, Anthropic>();
function client(byoKeyValue: string | undefined, surface: ModelCall["surface"]): Anthropic {
  if (byoKeyValue) return new Anthropic({ apiKey: byoKeyValue });
  const key = keyForSurface(surface);
  let c = clients.get(key);
  if (!c) {
    c = new Anthropic({ apiKey: key });
    clients.set(key, c);
  }
  return c;
}

export const callModel: ModelFn = async (call) => {
  if (injected) return injected(call);

  const anthropic = client(call.byoKeyValue, call.surface);
  const res = await anthropic.messages.create({
    model: call.model,
    max_tokens: call.maxTokens,
    // Stable system prompt is cached (ephemeral) to cut token cost on repeat calls.
    system: [
      { type: "text", text: call.system, cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: call.user }],
  });

  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  return {
    text,
    inputTokens: res.usage.input_tokens,
    outputTokens: res.usage.output_tokens,
    model: call.model,
  };
};

// --- Vision (used only for in-memory OCR transcription of an uploaded letter) ---

export interface VisionCall {
  bytes: Uint8Array;
  /** e.g. "image/jpeg", "image/png", "image/webp", "application/pdf". */
  mediaType: string;
  prompt: string;
  model: string;
  maxTokens: number;
}
export type VisionFn = (call: VisionCall) => Promise<ModelResult>;

let injectedVision: VisionFn | null = null;
/** Test seam — inject a fake vision model in tests. */
export function __setVisionForTests(fn: VisionFn | null): void {
  injectedVision = fn;
}

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

/** Read text from an image/PDF held in memory (no network/key needed in tests). */
export const callVision: VisionFn = async (call) => {
  if (injectedVision) return injectedVision(call);

  const anthropic = client(undefined, "default");
  const data = Buffer.from(call.bytes).toString("base64");
  let block: Anthropic.ContentBlockParam;
  if (call.mediaType === "application/pdf") {
    block = { type: "document", source: { type: "base64", media_type: "application/pdf", data } };
  } else {
    const media_type = (IMAGE_TYPES.has(call.mediaType) ? call.mediaType : "image/png") as
      | "image/jpeg"
      | "image/png"
      | "image/gif"
      | "image/webp";
    block = { type: "image", source: { type: "base64", media_type, data } };
  }
  const content: Anthropic.ContentBlockParam[] = [block, { type: "text", text: call.prompt }];

  const res = await anthropic.messages.create({
    model: call.model,
    max_tokens: call.maxTokens,
    messages: [{ role: "user", content }],
  });

  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  return {
    text,
    inputTokens: res.usage.input_tokens,
    outputTokens: res.usage.output_tokens,
    model: call.model,
  };
};
