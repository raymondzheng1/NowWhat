/**
 * Shared email sender (Resend REST, no SDK dependency — harness §16). Returns a result
 * object and fails loud (never throws into the caller); callers decide UX. The From and
 * Reply-To are configured, never echoing an operator's personal address into headers.
 *
 * Env: RESEND_API_KEY (required), CONTACT_TO_EMAIL (operator inbox; required),
 * CONTACT_FROM_EMAIL (OPTIONAL verified sender). With no verified domain we default to
 * Resend's shared sandbox sender `onboarding@resend.dev`, which can only deliver to the
 * Resend account owner's own address — so CONTACT_TO_EMAIL must be that address, and the
 * visitor acknowledgement is suppressed until a real domain is set (see hasVerifiedSender).
 */
export interface SendResult {
  ok: boolean;
  error?: string;
}

/** Resend's shared testing sender — works without verifying a domain (to your own inbox). */
const RESEND_SANDBOX_FROM = "What Now? <onboarding@resend.dev>";
const FROM = () => process.env.CONTACT_FROM_EMAIL?.trim() || RESEND_SANDBOX_FROM;

/** True once a real verified sending domain is configured (then we can email visitors too). */
export function hasVerifiedSender(): boolean {
  return Boolean(process.env.CONTACT_FROM_EMAIL?.trim());
}

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
