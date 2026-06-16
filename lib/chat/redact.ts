/**
 * Redact high-risk personal numbers before a message is sent to the model (chat intake).
 * We never store messages, but we also avoid passing payment/ID numbers to the provider —
 * they are never needed to route a government-decision matter. Conservative: only long
 * digit runs (cards, TFN/Medicare, bank/BSB-account) are removed; dates and short numbers
 * (which carry meaning, e.g. "30 days", "8 June") are preserved.
 */
export function redactPii(text: string): string {
  return (
    text
      // 12+ digit runs (allowing spaces/dashes) — card numbers, long account refs.
      .replace(/\b(?:\d[ -]?){12,19}\b/g, "[number removed]")
      // 9–11 digit runs — TFN / Medicare-shaped.
      .replace(/\b\d{9,11}\b/g, "[number removed]")
      // BSB-account shape: 123-456 789012
      .replace(/\b\d{3}-\d{3}\s?\d{6,9}\b/g, "[number removed]")
  );
}
