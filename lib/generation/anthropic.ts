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
  /** Prompt-cache tokens, billed apart from inputTokens (write 1.25x, read 0.1x). */
  cacheWriteTokens?: number;
  cacheReadTokens?: number;
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
/**
 * Inside the routes' five-minute limit. The SDK's own defaults — ten minutes and two retries — could
 * outlast it, so a stuck call was cut off by the platform instead of failing cleanly into the
 * person's fallback (the QA review, 2026-11-02). Our runner already retries on its own terms.
 */
const CLIENT_OPTIONS = { timeout: 120_000, maxRetries: 1 } as const;
function client(byoKeyValue: string | undefined, surface: ModelCall["surface"]): Anthropic {
  if (byoKeyValue) return new Anthropic({ apiKey: byoKeyValue, ...CLIENT_OPTIONS });
  const key = keyForSurface(surface);
  let c = clients.get(key);
  if (!c) {
    c = new Anthropic({ apiKey: key, ...CLIENT_OPTIONS });
    clients.set(key, c);
  }
  return c;
}

/**
 * Models that accept `thinking: { type: "disabled" }`.
 *
 * THINKING WAS EATING THE ANSWER. Current models think by default when `thinking` is left
 * out, and thinking tokens count against `max_tokens` — so the analysis's 1600 tokens were
 * mostly spent reasoning, and what came back was cut off mid-sentence ("but you say you have
 * never") with its last sections empty, after the repair pass closed the JSON. Measured live on
 * the owner's judicial-review case, 2026-11-01; it is also why those calls took 50 seconds.
 * Every task here is a short, structured, gated piece of writing, so thinking is turned off
 * where the model allows it.
 *
 * Newer models reject "disabled" with a 400 (Claude Opus 5.5, Claude Sonnet 5.5, Fable), so
 * the list is explicit: a model not on it keeps its default and gets headroom instead.
 */
// Haiku 5.5 accepts "disabled" at its default effort (medium); only xhigh/max refuse it.
export const THINKING_OFF_OK = /^claude-(sonnet-5|opus-5|opus-4-[5-8]|sonnet-4-[56]|haiku-4-5|haiku-5-5)(?:$|-\d{8}$)/;

/** Room for thinking on a model that will not turn it off, so it cannot crowd out the answer. */
const THINKING_HEADROOM = 6000;

export const callModel: ModelFn = async (call) => {
  if (injected) return injected(call);

  const anthropic = client(call.byoKeyValue, call.surface);
  const thinkingOff = THINKING_OFF_OK.test(call.model);
  const res = await anthropic.messages.create({
    model: call.model,
    max_tokens: thinkingOff ? call.maxTokens : call.maxTokens + THINKING_HEADROOM,
    ...(thinkingOff ? { thinking: { type: "disabled" as const } } : {}),
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
    cacheWriteTokens: res.usage.cache_creation_input_tokens ?? 0,
    cacheReadTokens: res.usage.cache_read_input_tokens ?? 0,
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
  /** The person's own key, when they sent one: their transcription is on their account. */
  byoKeyValue?: string;
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

  // On their key when they sent one: a BYO request is not metered, so on ours it would be free
  // to them and unmetered for us (the QA review, 2026-11-02).
  const anthropic = client(call.byoKeyValue, "default");
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

  // Transcription, not reasoning: left unset, the current models think first, paying for it and
  // spending the output room a two-page letter needs (the efficiency review, 2026-11-02).
  const thinkingOff = THINKING_OFF_OK.test(call.model);
  const res = await anthropic.messages.create({
    model: call.model,
    max_tokens: thinkingOff ? call.maxTokens : call.maxTokens + THINKING_HEADROOM,
    ...(thinkingOff ? { thinking: { type: "disabled" as const } } : {}),
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
    cacheWriteTokens: res.usage.cache_creation_input_tokens ?? 0,
    cacheReadTokens: res.usage.cache_read_input_tokens ?? 0,
    model: call.model,
  };
};
