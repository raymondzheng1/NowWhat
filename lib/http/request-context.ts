import { randomUUID } from "node:crypto";
import type { GuardContext } from "@/lib/cost/guard";

/**
 * Derives the cost-guard context from a request. The session id is a cookie used ONLY
 * for spend metering (PRD §6.1) — it is not tied to identity and stores no user data.
 * BYO-key: the user's own Anthropic key, held client-side, sent per request over HTTPS,
 * used for that request only and never stored or logged.
 */

const SID_COOKIE = "wn_sid";
const BYO_HEADER = "x-byo-anthropic-key";

function readCookie(req: Request, name: string): string | undefined {
  const raw = req.headers.get("cookie");
  if (!raw) return undefined;
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return undefined;
}

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "0.0.0.0";
}

export interface RequestContext {
  guard: GuardContext;
  byoKeyValue?: string;
  /** Set on the response when a new session cookie was minted. */
  setSidCookie?: string;
}

export function getRequestContext(req: Request): RequestContext {
  let sid = readCookie(req, SID_COOKIE);
  let setSidCookie: string | undefined;
  if (!sid) {
    sid = randomUUID();
    setSidCookie = `${SID_COOKIE}=${sid}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${60 * 60 * 24}`;
  }
  // Only something shaped like an Anthropic key counts as one. Any value used to switch every
  // meter off, and a call that does not take the key (transcription did not) then ran unmetered
  // on ours (the QA review, 2026-11-02). Anything else is ignored: the request is metered as usual.
  const sent = req.headers.get(BYO_HEADER)?.trim();
  const byoKeyValue = sent && /^sk-ant-[A-Za-z0-9_-]{20,}$/.test(sent) ? sent : undefined;

  return {
    guard: { sessionId: sid, ip: clientIp(req), byoKey: Boolean(byoKeyValue) },
    byoKeyValue,
    setSidCookie,
  };
}

/**
 * A request from another site's page — a form or script elsewhere spending this service's budget
 * through a visitor's browser (the QA review, 2026-11-02). The browser says so (Sec-Fetch-Site),
 * or its Origin names another host. Requests with neither (tests, curl, server-to-server) pass:
 * the rate limit and the caps still hold them.
 */
export function isCrossSite(req: Request): boolean {
  if (req.headers.get("sec-fetch-site") === "cross-site") return true;
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return !!host && new URL(origin).host !== host;
  } catch {
    return true;
  }
}
