import { NextResponse } from "next/server";
import type { RequestContext } from "@/lib/http/request-context";

/**
 * JSON response helper. Attaches the (metering-only) session cookie when newly minted
 * and marks every response no-store — these are per-request and must never be cached.
 */
export function apiJson(
  body: unknown,
  ctx: RequestContext,
  status = 200,
): NextResponse {
  const res = NextResponse.json(body, { status });
  if (ctx.setSidCookie) res.headers.append("Set-Cookie", ctx.setSidCookie);
  res.headers.set("Cache-Control", "no-store");
  return res;
}
