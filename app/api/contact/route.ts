import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRequestContext } from "@/lib/http/request-context";
import { apiJson } from "@/lib/http/respond";
import { getKv } from "@/lib/kv/redis";
import { sendEmail, isEmailConfigured, operatorEmail, escapeHtml, hasVerifiedSender } from "@/lib/email/send";
import { now } from "@/lib/time/clock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ContactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  message: z.string().trim().min(10).max(5000),
  // Honeypot. Accepts ANY value: rejecting a non-empty one at the schema level turned a
  // browser autofill into a 400 that highlighted no field, so a real person read "Please
  // check what you entered" with nothing to correct. Chrome fills this despite
  // autoComplete="off" because the old id and label both said "company". The route decides
  // what to do with it below.
  company: z.string().max(200).optional(),
});

const MAX_PER_IP_PER_HOUR = 3; // harness §16.3

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
  // Honeypot tripped. We used to drop the message silently, which meant an autofilled field
  // threw away a real person's enquiry with no trace. Now it is delivered and FLAGGED, so
  // nothing is ever lost and the operator can judge for themselves.
  const suspected = Boolean(parsed.data.company?.trim());

  if (!isEmailConfigured()) {
    return apiJson({ ok: false, message: "errors.contactUnavailable" }, ctx, 503);
  }

  // Light per-IP hourly limit (best-effort; never blocks on KV error). Harness §16.3.
  try {
    const hour = new Date(now()).toISOString().slice(0, 13); // YYYY-MM-DDTHH
    const key = `contact:${ctx.guard.ip}:${hour}`;
    const kv = getKv();
    const n = await kv.incr(key);
    if (n === 1) await kv.expire(key, 3600);
    if (n > MAX_PER_IP_PER_HOUR) {
      return apiJson({ ok: false, message: "errors.contactRateLimited" }, ctx, 429);
    }
  } catch {
    /* ignore limiter errors — contact should still work */
  }

  const { name, email, message } = parsed.data;
  const to = operatorEmail() as string;
  const result = await sendEmail({
    to,
    replyTo: email,
    subject: `${suspected ? "[possible spam] " : ""}What Now? — contact form: ${name}`.slice(0, 200),
    tag: suspected ? "contact-suspect" : "contact",
    text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
    html: `<h2>New contact-form message</h2><p><strong>Name:</strong> ${escapeHtml(name)}</p><p><strong>Email:</strong> ${escapeHtml(email)}</p><hr/><pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(message)}</pre>`,
  });

  if (!result.ok) {
    return apiJson({ ok: false, message: "errors.contactFailed" }, ctx, 502);
  }

  // Acknowledge to the user (best-effort; never blocks the success response). §16.3.
  // Only when a verified domain is configured — Resend's sandbox sender can't deliver to
  // arbitrary visitor addresses, so we skip the ack rather than make a guaranteed-failing call.
  if (hasVerifiedSender()) {
    void sendEmail({
      to: email,
      subject: "We've received your message — What Now?",
      tag: "contact-ack",
      text: `Hi ${name},\n\nThanks for reaching out — we've received your message and will get back to you. This inbox is for the service; for help with your own situation, free legal services are listed at our Get help page.\n\n— What Now?`,
      html: `<p>Hi ${escapeHtml(name)},</p><p>Thanks for reaching out — we&rsquo;ve received your message and will get back to you.</p><p>For help with your own situation, free legal services are listed on our Get help page.</p><p>— What Now?</p>`,
    });
  }

  return apiJson({ ok: true }, ctx);
}
