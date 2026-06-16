import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isModelConfigured, callModel } from "@/lib/generation/anthropic";
import { MODELS } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Lightweight config health check. Reports PRESENCE booleans only — never any secret
 * value. `?probe=1` additionally does ONE tiny model call and returns only the outcome
 * CLASS (ok / error + HTTP status + model id) to diagnose a bad key vs a bad model id.
 * TEMPORARY DIAGNOSTIC — remove after wiring is confirmed.
 */
export async function GET(req: NextRequest) {
  const base = {
    ok: true,
    model: isModelConfigured(),
    kv: Boolean(process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL),
  };

  const url = new URL(req.url);
  if (url.searchParams.get("probe") === "1" && isModelConfigured()) {
    try {
      await callModel({
        system: "Reply with the single character: x",
        user: "x",
        model: MODELS.primary,
        maxTokens: 4,
      });
      return NextResponse.json(
        { ...base, probe: "ok", modelId: MODELS.primary },
        { headers: { "Cache-Control": "no-store" } },
      );
    } catch (e: unknown) {
      const status =
        e && typeof e === "object" && "status" in e ? (e as { status?: unknown }).status : undefined;
      const name = e instanceof Error ? e.name : "unknown";
      const message = e instanceof Error ? e.message.slice(0, 120) : "unknown";
      return NextResponse.json(
        { ...base, probe: "error", status, name, message, modelId: MODELS.primary },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
  }

  return NextResponse.json(base, { headers: { "Cache-Control": "no-store" } });
}
