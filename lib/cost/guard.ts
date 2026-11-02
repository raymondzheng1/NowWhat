import { getKv, isKvConfigured } from "@/lib/kv/redis";
import { todayUtc } from "@/lib/time/clock";
import {
  SESSION_CAP_USD,
  GLOBAL_DAILY_BUDGET_USD,
  IP_RATE_LIMIT,
  IP_DAILY_CAP_USD,
  MODEL_PRICES_USD_PER_MTOK,
  UNPRICED_MODEL_USD_PER_MTOK,
} from "@/lib/config";

/**
 * Cost guard (PRD §6.9, harness §6.4). MUST run before every model call.
 * FAILS CLOSED: when KV is unconfigured or errors in production, requests are blocked.
 * BYO-key bypasses every meter (the user pays their own provider).
 */

export interface GuardContext {
  sessionId: string;
  ip: string;
  /** User supplied their own Anthropic key (client-held) — bypass all meters. */
  byoKey: boolean;
}

export type GuardReason = "cap" | "budget" | "rate" | "unconfigured" | "error";
export type GuardResult =
  | { allowed: true; byoKey: boolean }
  | { allowed: false; reason: GuardReason; message: string };

const SESSION_TTL = 60 * 60 * 24; // 24h
const DAILY_TTL = 60 * 60 * 48; // 48h
const sessionKey = (id: string) => `spend:${id}`;
const budgetKey = () => `budget:global:${todayUtc()}`;
const ipKey = (ip: string) => `ip:${ip}`;
const ipSpendKey = (ip: string) => `spend:ip:${ip}:${todayUtc()}`;

const isProd = () => process.env.NODE_ENV === "production";

/**
 * The price used when the model is not in our table.
 *
 * It used to be Sonnet’s. That reads as a sensible middle, and it is the one choice that
 * cannot be safe: ANTHROPIC_MODEL exists so the model can be changed without a deploy, and
 * the only model you would point it at that we have not priced is a NEWER, DEARER one. Every
 * such call would then be metered at a fraction of what it cost, the day’s budget would
 * count far too slowly, and the kill switch would fire long after the money was gone.
 *
 * So an unpriced model bills at the highest price we know. Over-metering trips the budget
 * early, which costs some answers; under-metering costs money that is already spent. The
 * effective values are on /api/health, so the real fix — add the model to the table — is
 * visible from outside.
 */
// An explicit sentinel, not the dearest row of the table: with the table at today's (lower)
// prices, "the dearest we know" would under-meter a newer, dearer model.
const UNPRICED = UNPRICED_MODEL_USD_PER_MTOK;

/** Estimate USD cost of one model call from token usage, cache writes and reads included. */
export function estimateCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cache: { write?: number; read?: number } = {},
): number {
  const p = MODEL_PRICES_USD_PER_MTOK[model] ?? UNPRICED;
  return (
    (inputTokens / 1_000_000) * p.input +
    ((cache.write ?? 0) / 1_000_000) * p.cacheWrite +
    ((cache.read ?? 0) / 1_000_000) * p.cacheRead +
    (outputTokens / 1_000_000) * p.output
  );
}

/** The cost of one model call as the API reported it. */
export function costOf(r: {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheWriteTokens?: number;
  cacheReadTokens?: number;
}): number {
  return estimateCostUsd(r.model, r.inputTokens, r.outputTokens, { write: r.cacheWriteTokens, read: r.cacheReadTokens });
}

export async function precheck(ctx: GuardContext): Promise<GuardResult> {

  // Fail closed: no KV in production means no safe metering → deny.
  if (!isKvConfigured() && isProd()) {
    return {
      allowed: false,
      reason: "unconfigured",
      message: "Service is temporarily unavailable. Please try again later.",
    };
  }

  try {
    const kv = getKv();

    // Per-IP rate limit (rolling window).
    const ipCount = await kv.incr(ipKey(ctx.ip));
    if (ipCount === 1) await kv.expire(ipKey(ctx.ip), IP_RATE_LIMIT.windowSeconds);
    if (ipCount > IP_RATE_LIMIT.max) {
      return {
        allowed: false,
        reason: "rate",
        message: "You've made a lot of requests. Please wait a little while and try again.",
      };
    }
    // Their own key pays for their own calls, so no meter applies to them — but the rate limit
    // above does (the QA review, 2026-11-02: a BYO request skipped it entirely).
    if (ctx.byoKey) return { allowed: true, byoKey: true };

    // Per-IP daily spend: the cap a client cannot shed by dropping its session cookie.
    const spentIp = Number((await kv.get<number>(ipSpendKey(ctx.ip))) ?? 0);
    if (spentIp >= IP_DAILY_CAP_USD) {
      return {
        allowed: false,
        reason: "cap",
        message: "You've reached today's limit for free answers. Free help is always available — and the step-by-step guide still works.",
      };
    }

    // Global daily budget kill-switch.
    const spentGlobal = Number((await kv.get<number>(budgetKey())) ?? 0);
    if (spentGlobal >= GLOBAL_DAILY_BUDGET_USD) {
      return {
        allowed: false,
        reason: "budget",
        message: "We've reached today's limit for free answers. Please try again tomorrow — or get free help now, which is always available.",
      };
    }

    // Per-session cap.
    const spentSession = Number((await kv.get<number>(sessionKey(ctx.sessionId))) ?? 0);
    if (spentSession >= SESSION_CAP_USD) {
      return {
        allowed: false,
        reason: "cap",
        message: "You've reached this session's limit for free answers. Free help is always available — and the step-by-step guide still works.",
      };
    }

    return { allowed: true, byoKey: false };
  } catch {
    // KV error: fail closed in production, allow in dev so local work isn't blocked.
    if (isProd()) {
      return { allowed: false, reason: "error", message: "Service is temporarily unavailable. Please try again later." };
    }
    return { allowed: true, byoKey: false };
  }
}

/** Record spend after a successful model call. No-op for BYO-key. */
export async function record(ctx: GuardContext, costUsd: number): Promise<void> {
  if (ctx.byoKey || costUsd <= 0) return;
  try {
    const kv = getKv();
    const s = await kv.incrbyfloat(sessionKey(ctx.sessionId), costUsd);
    if (s === costUsd) await kv.expire(sessionKey(ctx.sessionId), SESSION_TTL);
    const i = await kv.incrbyfloat(ipSpendKey(ctx.ip), costUsd);
    if (i === costUsd) await kv.expire(ipSpendKey(ctx.ip), DAILY_TTL);
    const g = await kv.incrbyfloat(budgetKey(), costUsd);
    if (g === costUsd) await kv.expire(budgetKey(), DAILY_TTL);
  } catch {
    // Never throw from accounting; the response already happened.
  }
}

/**
 * Whether one more model call still fits today's budget and this person's caps. `precheck` runs
 * once per request, and an analysis request then makes a dozen or more calls with their retries,
 * so the day could be overrun by a whole request (the QA review, 2026-11-02). Checked before each
 * call; a KV error lets the call go, since the request was already admitted by `precheck`.
 */
export async function withinBudget(ctx: GuardContext): Promise<boolean> {
  if (ctx.byoKey) return true;
  try {
    const kv = getKv();
    const [g, s, i] = await Promise.all([
      kv.get<number>(budgetKey()),
      kv.get<number>(sessionKey(ctx.sessionId)),
      kv.get<number>(ipSpendKey(ctx.ip)),
    ]);
    return Number(g ?? 0) < GLOBAL_DAILY_BUDGET_USD && Number(s ?? 0) < SESSION_CAP_USD && Number(i ?? 0) < IP_DAILY_CAP_USD;
  } catch {
    return true;
  }
}
