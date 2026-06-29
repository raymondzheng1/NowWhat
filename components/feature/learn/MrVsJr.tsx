"use client";

import { useState } from "react";
import Link from "next/link";
import type { Comparison } from "@/lib/schemas/legal";

/**
 * The merits-vs-judicial comparison + a calm "which fits?" chooser. The chooser is an
 * orientation aid, NOT advice and NOT a prediction: picking an answer reveals a neutral
 * explanation and points to the relevant explainer (or to free help when both could apply).
 */
const DEST: Record<string, { href: string; label: string }> = {
  "merits-review": { href: "/learn/merits-review", label: "Read about merits review" },
  "judicial-review": { href: "/learn/judicial-review", label: "Read about judicial review" },
  both: { href: "/help", label: "Get free help to choose" },
  help: { href: "/help", label: "Get free help" },
};

export function MrVsJr({ comparison, showChooser = true }: { comparison: Comparison; showChooser?: boolean }) {
  const [picked, setPicked] = useState<number | null>(null);

  return (
    <div className="space-y-8">
      {comparison.intro ? <p className="max-w-[60ch] text-[16px] leading-[1.7] text-ink">{comparison.intro}</p> : null}

      {/* Comparison — two columns on desktop, stacked rows on mobile */}
      <div className="overflow-hidden rounded-card border border-line">
        <div className="grid grid-cols-3 bg-rail text-rail-fg">
          <div className="p-3 text-[11px] uppercase tracking-[0.12em] text-rail-fg/70" />
          <div className="p-3 font-display text-[18px] font-semibold">Merits review</div>
          <div className="p-3 font-display text-[18px] font-semibold">Judicial review</div>
        </div>
        {comparison.rows.map((r, i) => (
          <div key={i} className={`grid grid-cols-3 ${i % 2 ? "bg-sand-surface" : "bg-paper"}`}>
            <div className="border-t border-line p-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-faint">{r.aspect}</div>
            <div className="border-t border-line p-3 text-[14.5px] leading-[1.5] text-ink">{r.mr}</div>
            <div className="border-t border-line p-3 text-[14.5px] leading-[1.5] text-ink">{r.jr}</div>
          </div>
        ))}
      </div>

      {showChooser && (
        <div className="rounded-card border border-line bg-sand-surface p-5">
          <h3 className="font-display text-[22px] font-semibold text-ink">{comparison.chooser.question}</h3>
          <div className="mt-4 space-y-2.5">
            {comparison.chooser.options.map((o, i) => {
              const isPicked = picked === i;
              return (
                <div key={i}>
                  <button
                    type="button"
                    onClick={() => setPicked(isPicked ? null : i)}
                    aria-expanded={isPicked}
                    className={`w-full rounded-card border px-4 py-3 text-left text-[15px] transition-colors ${
                      isPicked ? "border-rail bg-paper text-ink" : "border-line bg-paper text-ink hover:border-rail-accent"
                    }`}
                  >
                    {o.prompt}
                  </button>
                  {isPicked && (
                    <div className="mt-2 rounded-card border-l-[3px] border-help bg-help-soft px-4 py-3">
                      <p className="text-[14.5px] leading-[1.6] text-help-ink">{o.because}</p>
                      <Link href={(DEST[o.leadsTo] ?? DEST.help!).href} className="link-text mt-2 inline-block">
                        {(DEST[o.leadsTo] ?? DEST.help!).label}
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-[12px] text-ink-faint">This is general information to help you understand your options — not advice about your case.</p>
        </div>
      )}
    </div>
  );
}
