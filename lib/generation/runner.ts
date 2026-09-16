import type { z } from "zod";
import { callModel } from "@/lib/generation/anthropic";
import { systemPrompt, userPrompt, repairPrompt, type Task } from "@/lib/generation/prompts";
import { verifyOutput, type VerifyFailure } from "@/lib/verification/verify";
import { record, estimateCostUsd, type GuardContext } from "@/lib/cost/guard";
import { getKv } from "@/lib/kv/redis";
import { MODELS, MAX_GENERATION_ATTEMPTS } from "@/lib/config";
import type { PathwayEntry } from "@/lib/schemas/corpus";
import {
  GeneratedAnswerSchema,
  GeneratedDecodeSchema,
  GeneratedMemoSchema,
  GeneratedLetterSchema,
  type GeneratedAnswer,
  type GeneratedDecode,
  type GeneratedMemo,
  type GeneratedLetter,
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

/**
 * Governance record for blocked output (external legal review, 2026-08-23).
 *
 * The review asked us to log blocked outputs. We cannot log the output: a rejected draft is
 * built from the person's letter or their answers, and never storing that is the promise the
 * whole product rests on. What we record instead is the SHAPE of the block — which gate fired,
 * how many times, on which task, on which day. Gate names are a fixed set of identifiers we
 * chose ourselves, so no user text can travel in this key. There is no session id, no IP, no
 * draft, no prompt, and the counters expire.
 *
 * That is enough to answer the question the review was actually asking: is a gate firing far
 * more often than it should, and are people being shown "not covered" because our own gates
 * keep rejecting a grounded answer?
 */
const BLOCKED_METRIC_TTL_SECONDS = 60 * 60 * 24 * 90;

/** Keys are built from a fixed vocabulary only — belt and braces on top of that. */
const safeKeyPart = (s: string) => s.replace(/[^a-z0-9-]/gi, "").slice(0, 40).toLowerCase();

async function recordBlockedOutput(task: Task, gates: string[]): Promise<void> {
  const names = [...new Set(gates.map(safeKeyPart))].filter(Boolean);
  if (names.length === 0) return;
  try {
    const kv = getKv();
    const day = new Date().toISOString().slice(0, 10);
    const prefix = `wn:blocked:${day}:${safeKeyPart(task)}`;
    for (const key of [`${prefix}:_total`, ...names.map((n) => `${prefix}:${n}`)]) {
      await kv.incr(key);
      await kv.expire(key, BLOCKED_METRIC_TTL_SECONDS);
    }
  } catch {
    // A metric is never load-bearing. A KV outage must not change what the person is shown.
  }
}

export interface GenerationResult<T> {
  status: "answered" | "not-covered";
  /**
   * WHY we ended up with nothing, when we did. A genuine "the corpus does not cover this"
   * is a completely different event from "we generated an answer and our own gates rejected
   * it three times", and from the outside they were indistinguishable — which is how a total
   * model outage hid behind the honest "not covered" screen. Gate NAMES only: they are a
   * fixed set of identifiers, never the model's text, so nothing about the person's letter
   * can travel in here.
   */
  reason?: "not-in-corpus" | "gates-rejected";
  rejectedGates?: string[];
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
  /**
   * Sources this task may legitimately rely on beyond the pathway entry — the grounds and
   * processes it was actually given. `verifyOutput` has taken these since the legal corpus
   * arrived; the runner simply never passed them, so a memo citing a ground's own source
   * would have been rejected for citing something it was entitled to cite.
   */
  extraSources?: string[];
  /** See `citesNothing` in the verifier: for outputs that assert no law. */
  citesNothing?: boolean;
  /** Pull the verifiable prose + declared sources + covered flag out of the parsed shape. */
  extract: (data: T) => { covered: boolean; text: string; declaredSources: string[] };
}

async function runGeneration<T>(opts: RunOpts<T>): Promise<GenerationResult<T>> {
  const sys = systemPrompt(opts.task);
  let attempts = 0;
  let lastFailures: VerifyFailure[] | undefined;
  // The best answer we produced that cleared every SAFETY gate. See the fallback below.
  let readableEnough: { data: T; failures: VerifyFailure[] } | null = null;
  let retryHint: string | undefined;

  while (attempts < MAX_GENERATION_ATTEMPTS) {
    attempts++;

    // Always regenerate from CLEAN context — never feed a rejected draft back in.
    const res = await callModel({
      system: sys,
      user: userPrompt(opts.task, opts.context, opts.userInput, retryHint),
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
    if (!covered) return { status: "not-covered", attempts, reason: "not-in-corpus" };

    const verdict = verifyOutput({
      text,
      declaredSources,
      entry: opts.entry,
      extraSources: opts.extraSources,
      citesNothing: opts.citesNothing,
    });
    if (verdict.ok) return { status: "answered", data, attempts };
    lastFailures = verdict.failures; // diagnostic only — never contains PII
    await recordBlockedOutput(opts.task, verdict.failures.map((f) => f.gate));

    // Reading level is a QUALITY gate, not a safety gate: it measures how hard the text is
    // to read, not whether it could harm anyone. Its failure mode was inverted — we threw
    // away a grounded, non-advisory, correctly-sourced answer and showed the person nothing
    // at all, which is the least accessible outcome available. Hold on to an answer that
    // cleared every safety gate, and use it only if we run out of attempts.
    if (verdict.failures.every((f) => f.gate === "reading-level")) {
      readableEnough = { data, failures: verdict.failures };
    }

    // Tell the next attempt what to change, without ever feeding back the rejected draft.
    retryHint = verdict.failures.map((f) => `${f.gate} — ${f.detail}`).join("; ");
  }

  // Every safety gate passed; only readability fell short. An answer the person can read
  // with some effort beats no answer at all.
  if (readableEnough) {
    return {
      status: "answered",
      data: readableEnough.data,
      attempts,
      reason: "gates-rejected",
      rejectedGates: [...new Set(readableEnough.failures.map((f) => f.gate))],
    };
  }

  return {
    status: "not-covered",
    attempts,
    lastFailures,
    reason: lastFailures?.length ? "gates-rejected" : undefined,
    rejectedGates: lastFailures ? [...new Set(lastFailures.map((f) => f.gate))] : undefined,
  };
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

/**
 * Draft the application section of a memo.
 *
 * Same pipeline as every other task — cost guard, clean regeneration, the verifier, and a
 * fall to "not-covered" rather than shipping something that failed a gate. The caller treats
 * not-covered as "keep the deterministic memo", so a rejected draft costs the person nothing:
 * they still get the composed memo that needs no model at all.
 */
export function runMemo(
  args: Omit<RunOpts<GeneratedMemo>, "task" | "schema" | "extract">,
): Promise<GenerationResult<GeneratedMemo>> {
  return runGeneration<GeneratedMemo>({
    ...args,
    task: "memo",
    schema: GeneratedMemoSchema,
    extract: (d) => ({
      covered: d.covered,
      // EVERY sentence the model wrote goes to the verifier. Missing one here would be a
      // hole in the allow-list, the no-advice gate and the reading-level gate at once.
      text: [
        d.summary,
        ...d.application.flatMap((a) => [a.forThem, a.against, a.toTest]),
      ]
        .filter(Boolean)
        .join(" "),
      declaredSources: d.sources,
    }),
  });
}

/**
 * Improve the wording of a draft letter.
 *
 * The verifier sees the WHOLE letter, because in this task every sentence is customer-visible
 * output — there is no envelope to strip. `lib/letter/fidelity` then checks what a general
 * gate cannot: that the blanks survived and no figure appeared from nowhere.
 */
export function runLetterPolish(
  args: Omit<RunOpts<GeneratedLetter>, "task" | "schema" | "extract">,
): Promise<GenerationResult<GeneratedLetter>> {
  return runGeneration<GeneratedLetter>({
    ...args,
    task: "letter-polish",
    // A letter cites nothing: it says what happened to this person and asks for a review.
    citesNothing: true,
    schema: GeneratedLetterSchema,
    extract: (d) => ({ covered: d.covered, text: d.letter, declaredSources: d.sources }),
  });
}
