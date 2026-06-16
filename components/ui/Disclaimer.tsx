import { DISCLAIMER } from "@/lib/config";
import { Icon } from "@/components/ui/icons";

/**
 * The required disclaimer (harness §9.3 product constant; handoff load-bearing surface).
 * Brass left-border on ivory with an info icon. Rendered from the single DISCLAIMER
 * constant so it can never drift or be removed silently.
 */
export function Disclaimer({ className = "" }: { className?: string }) {
  return (
    <p
      role="note"
      className={`flex gap-2.5 rounded-r-input border-l-[3px] border-brass bg-paper-warm px-3.5 py-3 text-[13px] leading-relaxed text-ink-soft ${className}`}
    >
      <Icon.Info className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" strokeWidth={1.8} />
      <span>{DISCLAIMER}</span>
    </p>
  );
}
