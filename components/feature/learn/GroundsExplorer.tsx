"use client";

import { useState } from "react";
import Link from "next/link";
import type { Ground } from "@/lib/schemas/legal";

/**
 * Neutral, scannable list of the grounds of review — the same component for browsing (the
 * library) and for the in-flow "what might relate to your situation" step. Grounds are
 * shown in corpus order, NEVER ranked or visually privileged (no score). In selectable
 * mode the chosen grounds are reported up (→ the hand-off pack as "things to mention").
 *
 * Sticker album: a tidy grid of white sticker cards on the paper, each with a deterministic
 * tilt chosen by position (never randomised). Cards carry a hairline border as well as the
 * hard shadow so they still read when the explorer sits inside a white panel in-flow.
 *
 * Selected state never relies on colour alone: the checkbox glyph plus a 2px ink frame and
 * a bolder shadow carry it.
 */
const ROT = ["-0.8deg", "0.6deg", "-0.6deg", "0.9deg"];

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
    <ul className="grid gap-4 sm:grid-cols-2">
      {grounds.map((g, idx) => {
        const isOpen = openId === g.id;
        const isSel = selected.includes(g.id);
        return (
          <li
            key={g.id}
            className={`sticker rounded-card bg-paper p-4 sm:p-5 ${
              isSel ? "border-2 border-ink shadow-raised" : "border-2 border-line"
            }`}
            style={{ "--rot": ROT[idx % ROT.length] } as React.CSSProperties}
          >
            <div className="flex items-start gap-3">
              {selectable && (
                <label className="mt-0.5 flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-red-cta"
                    checked={isSel}
                    onChange={() => onToggle?.(g.id)}
                  />
                  <span className="sr-only">This relates to my situation: {g.plainName}</span>
                </label>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                  {linkBase ? (
                    <Link
                      href={`${linkBase}/${g.id}`}
                      className="font-display text-[19px] font-black leading-[1.2] text-ink underline decoration-transparent underline-offset-[3px] hover:decoration-red-ink"
                    >
                      {g.plainName}
                    </Link>
                  ) : (
                    <h3 className="font-display text-[19px] font-black leading-[1.2] text-ink">{g.plainName}</h3>
                  )}
                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? null : g.id)}
                    aria-expanded={isOpen}
                    className="link-text -mr-1 min-h-[44px] items-start px-1"
                  >
                    {isOpen ? "Less" : "More"}
                  </button>
                </div>
                <p className="mt-1 text-[15.5px] leading-[1.55] text-ink-soft">{g.oneLine}</p>

                {isOpen && (
                  <div className="mt-4 space-y-3.5 border-l-[3px] border-ink pl-4">
                    <p className="text-[16px] leading-[1.6] text-ink">{g.whatItMeans}</p>
                    <div>
                      <p className="font-display text-[12.5px] font-black uppercase tracking-[0.12em] text-red-ink">What might relate to this</p>
                      <ul className="mt-2 space-y-1.5 text-[15.5px] leading-[1.55] text-ink-soft">
                        {g.whatRelates.map((s, i) => (
                          <li key={i} className="flex gap-2.5">
                            <span aria-hidden className="mt-[9px] h-1.5 w-1.5 flex-none rounded-[2px] bg-red" />
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    {linkBase && (
                      <Link href={`${linkBase}/${g.id}`} className="link-text inline-flex min-h-[44px]">
                        Read the full explainer
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden="true">
                          <path d="M5 12h14M13 6l6 6-6 6" />
                        </svg>
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
