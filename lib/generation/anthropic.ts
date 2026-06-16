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
  return injected !== null || Boolean(process.env.ANTHROPIC_API_KEY);
}

let defaultClient: Anthropic | null = null;
function client(byoKeyValue?: string): Anthropic {
  if (byoKeyValue) return new Anthropic({ apiKey: byoKeyValue });
  if (!defaultClient) {
    defaultClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });
  }
  return defaultClient;
}

export const callModel: ModelFn = async (call) => {
  if (injected) return injected(call);

  const anthropic = client(call.byoKeyValue);
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
