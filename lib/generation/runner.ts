import type { z } from "zod";
import { callModel } from "@/lib/generation/anthropic";
import { systemPrompt, userPrompt, repairPrompt, type Task } from "@/lib/generation/prompts";
import { verifyOutput, type VerifyFailure } from "@/lib/verification/verify";
import { record, estimateCostUsd, type GuardContext } from "@/lib/cost/guard";
import { MODELS, MAX_GENERATION_ATTEMPTS } from "@/lib/config";
import type { PathwayEntry } from "@/lib/schemas/corpus";
import {
  GeneratedAnswerSchema,
  GeneratedDecodeSchema,
  type GeneratedAnswer,
  type GeneratedDecode,
} from "@/lib/schemas/generation";

/**
 * Generate → validate → verify → (structural repair | regenerate) → fall back to
 * "not covered" (TECHNICAL_SPEC §6, harness §11). Content failures are NEVER patched
 * in-loop — they regenerate from clean context. Cost is recorded after every call.
 */

function stripFences(s: string): string {
  return s.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
}

function tryParse(text: string): unknown | null {
  try {
    return JSON.parse(stripFences(text));
  } catch {
    // Sometimes a JSON object is embedded in stray prose — grab the outermost braces.
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

export interface GenerationResult<T> {
  status: "answered" | "not-covered";
  data?: T;
  attempts: number;
  lastFailures?: VerifyFailure[];
}

interface RunOpts<T> {
  task: Task;
  entry: PathwayEntry;
  context: string;
  userInput: string;
  guard: GuardContext;
  byoKeyValue?: string;
  schema: z.ZodTypeAny;
  /** Pull the verifiable prose + declared sources + covered flag out of the parsed shape. */
  extract: (data: T) => { covered: boolean; text: string; declaredSources: string[] };
}

async function runGeneration<T>(opts: RunOpts<T>): Promise<GenerationResult<T>> {
  const sys = systemPrompt(opts.task);
  let attempts = 0;
  let lastFailures: VerifyFailure[] | undefined;

  while (attempts < MAX_GENERATION_ATTEMPTS) {
    attempts++;

    // Always regenerate from CLEAN context — never feed a rejected draft back in.
    const res = await callModel({
      system: sys,
      user: userPrompt(opts.task, opts.context, opts.userInput),
      model: MODELS.primary,
      maxTokens: 1200,
      byoKeyValue: opts.byoKeyValue,
    });
    await record(opts.guard, estimateCostUsd(res.model, res.inputTokens, res.outputTokens));

    let parsed = tryParse(res.text);

    // Structural-only repair with the cheap model (content-preserving, harness §11).
    if (parsed === null) {
      const repair = await callModel({
        system: "You fix malformed JSON. Output only valid JSON.",
        user: repairPrompt(res.text, opts.task),
        model: MODELS.small,
        maxTokens: 1200,
        byoKeyValue: opts.byoKeyValue,
      });
      await record(opts.guard, estimateCostUsd(repair.model, repair.inputTokens, repair.outputTokens));
      parsed = tryParse(repair.text);
    }
    if (parsed === null) continue;

    const safe = opts.schema.safeParse(parsed);
    if (!safe.success) continue;
    const data = safe.data as T;

    const { covered, text, declaredSources } = opts.extract(data);
    if (!covered) return { status: "not-covered", attempts };

    const verdict = verifyOutput({ text, declaredSources, entry: opts.entry });
    if (verdict.ok) return { status: "answered", data, attempts };
    lastFailures = verdict.failures; // diagnostic only — never contains PII
  }

  return { status: "not-covered", attempts, lastFailures };
}

export function runAsk(
  args: Omit<RunOpts<GeneratedAnswer>, "task" | "schema" | "extract">,
): Promise<GenerationResult<GeneratedAnswer>> {
  return runGeneration<GeneratedAnswer>({
    ...args,
    task: "ask",
    schema: GeneratedAnswerSchema,
    extract: (d) => ({
      covered: d.covered,
      text: [d.restated, d.answer, d.nextStep].filter(Boolean).join(" "),
      declaredSources: d.sources,
    }),
  });
}

export function runDecode(
  args: Omit<RunOpts<GeneratedDecode>, "task" | "schema" | "extract">,
): Promise<GenerationResult<GeneratedDecode>> {
  return runGeneration<GeneratedDecode>({
    ...args,
    task: "decode",
    schema: GeneratedDecodeSchema,
    extract: (d) => ({
      covered: d.covered,
      text: [d.whatItIs, d.whatItMeans, ...d.options].filter(Boolean).join(" "),
      declaredSources: d.sources,
    }),
  });
}
