"use client";

import { useState } from "react";
import Link from "next/link";
import type { Comparison } from "@/lib/schemas/legal";

/**
 * The merits-vs-judicial comparison + a calm "which fits?" chooser. The chooser is an
 * orientation aid, NOT advice and NOT a prediction: picking an answer reveals a neutral
 * explanation and points to the relevant explainer (or to free help when both could apply).
 *
 * Sticker album: the comparison stays a real, upright table with ink rules — never tilted,
 * because this is the surface people scan line by line. Only the chooser is a sticker.
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
      {comparison.intro ? <p className="max-w-[60ch] text-[16.5px] leading-[1.7] text-ink">{comparison.intro}</p> : null}

      {/* Comparison — a plain table with ink rules. Deliberately upright and unrotated. */}
      <div className="overflow-x-auto rounded-card border-2 border-ink bg-paper shadow-card">
        <table className="w-full table-fixed border-collapse text-left">
          <thead>
            <tr className="bg-ink text-cream">
              <th scope="col" className="w-1/3 p-3 font-display text-[12.5px] font-black uppercase tracking-[0.12em] text-cream/80 sm:w-[24%]">
                <span className="sr-only">Aspect</span>
              </th>
              <th scope="col" className="p-3 font-display text-[18px] font-black text-cream">Merits review</th>
              <th scope="col" className="p-3 font-display text-[18px] font-black text-cream">Judicial review</th>
            </tr>
          </thead>
          <tbody>
            {comparison.rows.map((r, i) => (
              <tr key={i} className={i % 2 ? "bg-cream" : "bg-paper"}>
                <th
                  scope="row"
                  className="border-t border-line p-3 align-top font-display text-[12.5px] font-black uppercase tracking-[0.1em] text-ink-faint"
                >
                  {r.aspect}
                </th>
                <td className="border-t border-line p-3 align-top text-[15.5px] leading-[1.5] text-ink">{r.mr}</td>
                <td className="border-t border-line p-3 align-top text-[15.5px] leading-[1.5] text-ink">{r.jr}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showChooser && (
        <div
          className="card sticker border-2 border-line"
          style={{ "--rot": "-0.7deg" } as React.CSSProperties}
        >
          <h3 className="font-display text-[22px] font-black text-ink">{comparison.chooser.question}</h3>
          <div className="mt-4 space-y-3">
            {comparison.chooser.options.map((o, i) => {
              const isPicked = picked === i;
              return (
                <div key={i}>
                  <button
                    type="button"
                    onClick={() => setPicked(isPicked ? null : i)}
                    aria-expanded={isPicked}
                    className={`w-full rounded-card px-4 py-3.5 text-left text-[16px] leading-[1.5] text-ink transition-colors ${
                      isPicked
                        ? "border-2 border-ink bg-cream font-semibold shadow-sticker"
                        : "border-2 border-line bg-paper hover:border-ink"
                    }`}
                  >
                    {o.prompt}
                  </button>
                  {isPicked && (
                    <div className="mt-2.5 rounded-card border-l-[6px] border-help bg-help-soft px-4 py-3.5">
                      <p className="text-[15.5px] leading-[1.6] text-help-ink">{o.because}</p>
                      <Link href={(DEST[o.leadsTo] ?? DEST.help!).href} className="link-text mt-1.5 inline-flex min-h-[44px]">
                        {(DEST[o.leadsTo] ?? DEST.help!).label}
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden="true">
                          <path d="M5 12h14M13 6l6 6-6 6" />
                        </svg>
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-5 text-[14.5px] leading-[1.55] text-ink-faint">
            This is general information to help you understand your options — not advice about your case.
          </p>
        </div>
      )}
    </div>
  );
}
