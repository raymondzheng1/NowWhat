import { sendEmail, operatorEmail, escapeHtml } from "@/lib/email/send";

/**
 * QA copies of what people ask us.
 *
 * The owner asked for every interaction to reach the operator inbox so the service can be
 * judged on real use rather than on test data. This is that, and it is deliberately the
 * ONLY place in the codebase that sends user-entered content anywhere.
 *
 * READ THIS BEFORE CHANGING ANYTHING HERE:
 *
 * The app currently tells people "Nothing you type is kept" and "Nothing on this page was
 * saved", and the privacy policy says the same. While this is switched on, those statements
 * are not true. The owner's decision, taken knowingly for a testing period, with the policy
 * to be squared away afterwards — but it is a promise to a vulnerable audience, so it is
 * recorded here rather than buried in a diff.
 *
 * Guard rails that ARE in place:
 *   · Off unless QA_EMAIL_INTERACTIONS === "1" AND an operator inbox is configured, so it
 *     cannot switch itself on by accident in a future deploy.
 *   · Fire-and-forget: a mail failure can never break, delay or leak into the user's answer.
 *   · Nothing is written to disk, to KV, or to a log — the copy goes to one inbox and the
 *     request-scoped data is discarded exactly as before.
 *   · No IP address, no user agent, no cookie, no identifier of any kind is attached.
 *
 * A decode never sends the letter IMAGE, only the text the person chose to submit.
 */
export type QaKind = "ask" | "decode" | "chat" | "draft";

export function qaEnabled(): boolean {
  return process.env.QA_EMAIL_INTERACTIONS === "1" && Boolean(operatorEmail());
}

/**
 * Fire-and-forget. Never awaited by a request handler: QA must not add latency to, or risk
 * failing, the answer the person is waiting for.
 */
export function sendQaCopy(kind: QaKind, fields: Record<string, string | undefined>): void {
  if (!qaEnabled()) return;
  const to = operatorEmail();
  if (!to) return;

  const rows = Object.entries(fields)
    .filter(([, v]) => v && v.trim())
    .map(([k, v]) => ({ k, v: v as string }));

  const text = rows.map((r) => `${r.k}:\n${r.v}`).join("\n\n");
  const html =
    `<h2>What Now? — ${escapeHtml(kind)}</h2>` +
    rows
      .map(
        (r) =>
          `<p><strong>${escapeHtml(r.k)}</strong></p>` +
          `<pre style="white-space:pre-wrap;font-family:inherit;background:#f6edd9;padding:10px;border-radius:6px">${escapeHtml(r.v)}</pre>`,
      )
      .join("") +
    `<hr/><p style="color:#786a4a;font-size:12px">QA copy. Sent because QA_EMAIL_INTERACTIONS=1.</p>`;

  void sendEmail({
    to,
    subject: `What Now? QA — ${kind}`,
    tag: `qa-${kind}`,
    text,
    html,
  }).catch(() => {
    /* QA must never affect the person's request */
  });
}
