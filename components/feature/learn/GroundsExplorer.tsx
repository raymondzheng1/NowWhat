"use client";

import { useState } from "react";
import Link from "next/link";
import type { Ground } from "@/lib/schemas/legal";

/**
 * Neutral, scannable list of the grounds of review — the same component for browsing (the
 * library) and for the in-flow "what might relate to your situation" step. Grounds are
 * shown in corpus order, NEVER ranked or visually privileged (no score). In selectable
 * mode the chosen grounds are reported up (→ the hand-off pack as "things to mention").
 */
export function GroundsExplorer({
  grounds,
  selectable = false,
  selected = [],
  onToggle,
  linkBase,
}: {
  grounds: Ground[];
  selectable?: boolean;
  selected?: string[];
  onToggle?: (id: string) => void;
  /** If set, the plain name links to `${linkBase}/${id}` (the full per-ground page). */
  linkBase?: string;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <ul className="divide-y divide-line border-y border-line">
      {grounds.map((g) => {
        const isOpen = openId === g.id;
        const isSel = selected.includes(g.id);
        return (
          <li key={g.id} className="py-4">
            <div className="flex items-start gap-3">
              {selectable && (
                <label className="mt-0.5 flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-rail"
                    checked={isSel}
                    onChange={() => onToggle?.(g.id)}
                  />
                  <span className="sr-only">This relates to my situation: {g.plainName}</span>
                </label>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  {linkBase ? (
                    <Link href={`${linkBase}/${g.id}`} className="font-display text-[19px] font-semibold text-ink hover:text-accent">
                      {g.plainName}
                    </Link>
                  ) : (
                    <h3 className="font-display text-[19px] font-semibold text-ink">{g.plainName}</h3>
                  )}
                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? null : g.id)}
                    aria-expanded={isOpen}
                    className="text-[12px] font-semibold uppercase tracking-[0.1em] text-accent"
                  >
                    {isOpen ? "Less" : "More"}
                  </button>
                </div>
                <p className="mt-1 text-[14.5px] leading-[1.55] text-ink-soft">{g.oneLine}</p>

                {isOpen && (
                  <div className="mt-3 space-y-3 border-l-2 border-line pl-4">
                    <p className="text-[15px] leading-[1.6] text-ink">{g.whatItMeans}</p>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">What might relate to this</p>
                      <ul className="mt-1.5 space-y-1.5 text-[14.5px] leading-[1.55] text-ink-soft">
                        {g.whatRelates.map((s, i) => (
                          <li key={i} className="flex gap-2">
                            <span aria-hidden className="mt-2 h-1 w-1 flex-none rounded-full bg-accent" />
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    {linkBase && (
                      <Link href={`${linkBase}/${g.id}`} className="link-text inline-block">
                        Read the full explainer
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
