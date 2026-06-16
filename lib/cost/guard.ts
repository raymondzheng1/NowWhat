import { getKv, isKvConfigured } from "@/lib/kv/redis";
import { todayUtc } from "@/lib/time/clock";
import {
  SESSION_CAP_USD,
  GLOBAL_DAILY_BUDGET_USD,
  IP_RATE_LIMIT,
  MODEL_PRICES_USD_PER_MTOK,
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

const isProd = () => process.env.NODE_ENV === "production";

/** Estimate USD cost of one model call from token usage. */
export function estimateCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const p = MODEL_PRICES_USD_PER_MTOK[model] ?? { input: 3, output: 15 };
  return (inputTokens / 1_000_000) * p.input + (outputTokens / 1_000_000) * p.output;
}

export async function precheck(ctx: GuardContext): Promise<GuardResult> {
  if (ctx.byoKey) return { allowed: true, byoKey: true };

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

    // Global daily budget kill-switch.
    const spentGlobal = Number((await kv.get<number>(budgetKey())) ?? 0);
    if (spentGlobal >= GLOBAL_DAILY_BUDGET_USD) {
      return {
        allowed: false,
        reason: "budget",
        message: "We've reached today's free usage limit. Please try again tomorrow, or use your own key.",
      };
    }

    // Per-session cap.
    const spentSession = Number((await kv.get<number>(sessionKey(ctx.sessionId))) ?? 0);
    if (spentSession >= SESSION_CAP_USD) {
      return {
        allowed: false,
        reason: "cap",
        message: "You've reached this session's free usage limit. You can use your own key to continue.",
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
    const g = await kv.incrbyfloat(budgetKey(), costUsd);
    if (g === costUsd) await kv.expire(budgetKey(), DAILY_TTL);
  } catch {
    // Never throw from accounting; the response already happened.
  }
}
