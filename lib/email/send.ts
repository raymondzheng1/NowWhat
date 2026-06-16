/**
 * Shared email sender (Resend REST, no SDK dependency — harness §16). Returns a result
 * object and fails loud (never throws into the caller); callers decide UX. The From and
 * Reply-To are configured, never echoing an operator's personal address into headers.
 *
 * Env: RESEND_API_KEY, CONTACT_FROM_EMAIL (verified sender), CONTACT_TO_EMAIL (operator).
 */
export interface SendResult {
  ok: boolean;
  error?: string;
}

const FROM = () => process.env.CONTACT_FROM_EMAIL?.trim() || "What Now? <noreply@whatnow.local>";

/** Operator inbox (harness §16.3 uses ADMIN_NOTIFY_EMAIL; CONTACT_TO_EMAIL is a fallback). */
export function operatorEmail(): string | undefined {
  return process.env.ADMIN_NOTIFY_EMAIL?.trim() || process.env.CONTACT_TO_EMAIL?.trim();
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && operatorEmail());
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  tag?: string;
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "email-not-configured" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM(),
        to: [opts.to],
        reply_to: opts.replyTo,
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
        tags: opts.tag ? [{ name: "kind", value: opts.tag }] : undefined,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { ok: false, error: `resend-${res.status}` };
    return { ok: true };
  } catch {
    return { ok: false, error: "network" };
  }
}

/** Escape user-supplied text before embedding in email HTML. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
