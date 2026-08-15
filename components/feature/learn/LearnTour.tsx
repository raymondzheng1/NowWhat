"use client";

import { useState } from "react";
import Link from "next/link";
import type { Process, Comparison, Ground } from "@/lib/schemas/legal";
import { ProcessExplainer } from "@/components/feature/learn/ProcessExplainer";
import { MrVsJr } from "@/components/feature/learn/MrVsJr";
import { GroundsExplorer } from "@/components/feature/learn/GroundsExplorer";

/**
 * Guided "2-minute tour" — one concept per screen, for someone learning cold. Reuses the
 * same renderers as the library and in-flow (one concept set, many surfaces). Calm paging,
 * progress, keyboard-friendly; no model, nothing stored.
 *
 * Sticker album: the progress strip reads as a row of filled/empty album slots, the step
 * counter is a receipt line, and the pager sits under a 2px ink rule.
 */
export function LearnTour({
  processes,
  comparison,
  grounds,
}: {
  processes: Process[];
  comparison: Comparison;
  grounds: Ground[];
}) {
  const mr = processes.find((p) => p.id === "merits-review");
  const jr = processes.find((p) => p.id === "judicial-review");

  const steps: { label: string; node: React.ReactNode }[] = [
    {
      label: "Start",
      node: (
        <div className="max-w-[60ch]">
          <h2 className="font-display text-[30px] font-black leading-[1.08] text-ink">Two ways to challenge a decision</h2>
          <p className="mt-4 text-[17px] leading-[1.7] text-ink-soft">
            When a government decision goes against you, there are usually two paths. They ask different
            questions and lead to different places. This quick tour walks through each one — take it at
            your own pace, and stop whenever you have what you need.
          </p>
        </div>
      ),
    },
    ...(mr ? [{ label: "Merits", node: <ProcessExplainer process={mr} compact /> }] : []),
    ...(jr ? [{ label: "Judicial", node: <ProcessExplainer process={jr} compact /> }] : []),
    { label: "Which?", node: <MrVsJr comparison={comparison} /> },
    {
      label: "Grounds",
      node: (
        <div>
          <h2 className="font-display text-[28px] font-black leading-[1.1] text-ink">The grounds people raise</h2>
          <p className="mt-3 max-w-[60ch] text-[16.5px] leading-[1.65] text-ink-soft">
            For judicial review you need a “ground” — a specific problem with how the decision was made.
            Here are the common ones; open any to read more.
          </p>
          <div className="mt-6">
            <GroundsExplorer grounds={grounds} linkBase="/learn/grounds" />
          </div>
        </div>
      ),
    },
    {
      label: "Next",
      node: (
        <div className="max-w-[60ch]">
          <h2 className="font-display text-[30px] font-black leading-[1.08] text-ink">That’s the map</h2>
          <p className="mt-4 text-[17px] leading-[1.7] text-ink-soft">
            You now know the two paths and the grounds people raise. The next step is to find the body and
            the time limit for <em>your</em> decision — and a draft you can send.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/start"
              className="btn btn-primary sticker"
              style={{ "--rot": "-0.8deg" } as React.CSSProperties}
            >
              Work out my decision
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
            <Link
              href="/help"
              className="btn btn-secondary sticker"
              style={{ "--rot": "0.7deg" } as React.CSSProperties}
            >
              Get free help
            </Link>
          </div>
        </div>
      ),
    },
  ];

  const [i, setI] = useState(0);
  const atStart = i === 0;
  const atEnd = i === steps.length - 1;
  const cur = steps[i]!;

  return (
    <div>
      {/* Progress — filled album slots behind you, empty ones ahead */}
      <div className="flex items-center gap-1.5" aria-hidden="true">
        {steps.map((_, n) => (
          <span
            key={n}
            className={`h-2 flex-1 rounded-pill ${n <= i ? "bg-ink" : "border-2 border-line bg-transparent"}`}
          />
        ))}
      </div>
      <p className="mt-2.5 font-mono text-[12.5px] uppercase tracking-[0.06em] text-ink-faint">
        Step {i + 1} of {steps.length} · {cur.label}
      </p>

      <div className="mt-7 min-h-[280px]">{cur.node}</div>

      <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t-2 border-ink pt-6">
        <button
          type="button"
          onClick={() => setI((v) => Math.max(0, v - 1))}
          disabled={atStart}
          className="btn btn-secondary disabled:opacity-40 disabled:shadow-none"
        >
          ← Back
        </button>
        {!atEnd ? (
          <button
            type="button"
            onClick={() => setI((v) => Math.min(steps.length - 1, v + 1))}
            className="btn btn-primary sticker"
            style={{ "--rot": "0.7deg" } as React.CSSProperties}
          >
            Next
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        ) : (
          <Link href="/learn" className="link-text min-h-[44px] px-1">All topics →</Link>
        )}
      </div>
    </div>
  );
}
