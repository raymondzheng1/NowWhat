import { DISCLAIMER } from "@/lib/config";

/**
 * The required disclaimer (harness §9.3 product constant). Must appear on every answer
 * surface and FAQ page. Rendered from the single DISCLAIMER constant so it can never
 * drift or be removed silently.
 */
export function Disclaimer({ className = "" }: { className?: string }) {
  return (
    <p
      role="note"
      className={`rounded-card border border-line bg-paper-sunk px-4 py-3 text-sm text-ink-soft ${className}`}
    >
      {DISCLAIMER}
    </p>
  );
}
