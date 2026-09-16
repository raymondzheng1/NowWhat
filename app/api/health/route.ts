import { NextResponse } from "next/server";
import { isModelConfigured } from "@/lib/generation/anthropic";
import { isKvConfigured } from "@/lib/kv/redis";
import {
  SESSION_CAP_USD,
  GLOBAL_DAILY_BUDGET_USD,
  IP_RATE_LIMIT,
  MODELS,
} from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Lightweight config health check — the one place to confirm a deployment is wired up
 * without reading a secret out of anything.
 *
 * It reports PRESENCE and EFFECTIVE VALUES, never a key. The effective numbers matter as
 * much as the booleans: the cost caps are read from the environment at module load, a value
 * that is not a real number quietly falls back to its default (see `usdFromEnv`), and the
 * difference between "my $15 budget took effect" and "my $15 budget was ignored and it is
 * still $50" is otherwise invisible until the bill arrives.
 *
 * `model` = an Anthropic key is present. Without it every model-backed surface degrades to
 *           its deterministic output — the guided flow still works, it is just plainer.
 * `kv`    = a metering store is configured. This asks the SAME question the cost guard asks
 *           (`isKvConfigured`), which needs a URL *and* a token. It used to check only the
 *           URL, so a deployment with the token missing was told it was healthy while every
 *           model call was being denied by the fail-closed guard.
 */
export function GET() {
  return NextResponse.json(
    {
      ok: true,
      model: isModelConfigured(),
      kv: isKvConfigured(),
      effective: {
        primaryModel: MODELS.primary,
        sessionCapUsd: SESSION_CAP_USD,
        globalDailyBudgetUsd: GLOBAL_DAILY_BUDGET_USD,
        ipRequestsPerHour: IP_RATE_LIMIT.max,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
