import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRequestContext } from "@/lib/http/request-context";
import { apiJson } from "@/lib/http/respond";
import { getKv } from "@/lib/kv/redis";
import { sendEmail, isEmailConfigured, escapeHtml } from "@/lib/email/send";
import { todayUtc } from "@/lib/time/clock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ContactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  message: z.string().trim().min(10).max(5000),
  // Honeypot — real users leave this empty; bots fill it.
  company: z.string().max(0).optional().or(z.literal("")),
});

const MAX_PER_IP_PER_DAY = 5;

/** Contact form (harness §16). Sends to the operator via Resend; nothing is stored. */
export async function POST(req: NextRequest) {
  const ctx = getRequestContext(req);
  const bad = () => apiJson({ ok: false, message: "errors.badInput" }, ctx, 400);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return bad();
  }
  const parsed = ContactSchema.safeParse(body);
  if (!parsed.success) return bad();
  // Honeypot tripped → pretend success, send nothing.
  if (parsed.data.company) return apiJson({ ok: true }, ctx);

  if (!isEmailConfigured()) {
    return apiJson({ ok: false, message: "errors.contactUnavailable" }, ctx, 503);
  }

  // Light per-IP daily limit (best-effort; never blocks on KV error).
  try {
    const key = `contact:${ctx.guard.ip}:${todayUtc()}`;
    const kv = getKv();
    const n = await kv.incr(key);
    if (n === 1) await kv.expire(key, 86_400);
    if (n > MAX_PER_IP_PER_DAY) {
      return apiJson({ ok: false, message: "errors.contactRateLimited" }, ctx, 429);
    }
  } catch {
    /* ignore limiter errors — contact should still work */
  }

  const { name, email, message } = parsed.data;
  const result = await sendEmail({
    to: process.env.CONTACT_TO_EMAIL as string,
    replyTo: email,
    subject: `What Now? — contact form: ${name}`.slice(0, 200),
    tag: "contact",
    text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
    html: `<h2>New contact-form message</h2><p><strong>Name:</strong> ${escapeHtml(name)}</p><p><strong>Email:</strong> ${escapeHtml(email)}</p><hr/><pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(message)}</pre>`,
  });

  if (!result.ok) {
    return apiJson({ ok: false, message: "errors.contactFailed" }, ctx, 502);
  }
  return apiJson({ ok: true }, ctx);
}
