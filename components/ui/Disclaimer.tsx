import { DISCLAIMER } from "@/lib/config";
import { Icon } from "@/components/ui/icons";

/**
 * The required disclaimer (harness §9.3 product constant; handoff load-bearing surface).
 * A standing, neutral note: 2px ink left rule on a deep-cream ground with the info glyph.
 * Deliberately NOT amber (amber is reserved for time limits) and NOT the dashed empty
 * slot (nothing here is missing). Rendered from the single DISCLAIMER constant so it can
 * never drift or be removed silently.
 */
export function Disclaimer({ className = "" }: { className?: string }) {
  return (
    <p
      role="note"
      className={`flex gap-2.5 rounded-r-sticker border-l-2 border-ink bg-cream-deep px-4 py-3.5 text-[14.5px] leading-relaxed text-ink-soft ${className}`}
    >
      <Icon.Info className="mt-0.5 h-[17px] w-[17px] shrink-0 text-ink" strokeWidth={2} />
      <span>{DISCLAIMER}</span>
    </p>
  );
}
