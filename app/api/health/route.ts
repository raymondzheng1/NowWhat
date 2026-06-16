import { NextResponse } from "next/server";
import { isModelConfigured } from "@/lib/generation/anthropic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Lightweight config health check. Reports PRESENCE booleans only — never any secret
 * value — so deployment env wiring can be confirmed without exposing keys.
 * `model` = an Anthropic key is present (enables /ask + /decode).
 * `kv`    = a metering store is configured (the cost guard needs this in production).
 */
export function GET() {
  return NextResponse.json(
    {
      ok: true,
      model: isModelConfigured(),
      kv: Boolean(
        process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
      ),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
