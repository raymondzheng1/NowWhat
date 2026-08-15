"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { EntrySummary } from "@/lib/corpus/summary";
import type { DeadlineResult } from "@/lib/deadline/compute";
import { Icon } from "@/components/ui/icons";
import { postDeadline } from "@/components/feature/api";

function downloadIcs(ics: string) {
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "deadline-reminder.ics";
  a.click();
  URL.revokeObjectURL(url);
}

function formatLong(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Intl.DateTimeFormat("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(y, m - 1, d));
}

/**
 * Time-limit note for the legacy decode flow. Product decision (2026-06-30): time limits
 * are NOT headlined for our users, so this is a CALM card — amber, never red, and no
 * "days left" countdown. It keeps the optional, opt-in calendar reminder (some people
 * find a date useful), shown modestly. The verified-only guarantee is still enforced
 * upstream (deadlineIsRenderable + the verifier) — this only renders what it's given.
 *
 * Amber is reserved for exactly this surface. The "we can't confirm it" state stays in
 * the same calm amber card — it is never the dashed empty slot, because a time limit is
 * not a gap in the album, and never red, because red is not used for time pressure.
 */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="sticker rounded-card border-2 border-amber-border bg-amber-bg p-5 shadow-deadline sm:p-6"
      style={{ "--rot": "-0.6deg" } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

function Eyebrow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 font-display text-[12.5px] font-black uppercase tracking-[0.12em] text-amber-ink">
      {icon}
      {children}
    </div>
  );
}

/** The receipt line under a time limit — every figure carries its source. */
function SourceLine({ source }: { source: string }) {
  return (
    <p className="mono mt-3.5 leading-snug text-amber-ink">
      {/* Only the label is uppercased — the citation keeps its own case, because these
          are statute names and section numbers ("Residential Tenancies Act 1997 (Vic)
          s 91ZZS"), which all-caps makes materially harder to read. */}
      <span className="tracking-[0.08em]">SOURCE:</span> {source}
    </p>
  );
}

export function DeadlineCard({
  entry,
  decisionDate,
}: {
  entry: EntrySummary;
  decisionDate?: string;
}) {
  const primary = entry.pathways.find((p) => p.deadlineRenderable);
  const [date, setDate] = useState(decisionDate ?? "");
  const [result, setResult] = useState<DeadlineResult | null>(null);
  const [ics, setIcs] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [showHow, setShowHow] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  const compute = useCallback(
    async (d: string) => {
      if (!primary || !d) return;
      setBusy(true);
      const r = await postDeadline(entry.id, primary.name, d);
      if (r.ok) {
        setResult(r.deadline);
        setIcs(r.ics);
      }
      setBusy(false);
    },
    [entry.id, primary],
  );

  useEffect(() => {
    if (decisionDate && primary) void compute(decisionDate);
  }, [decisionDate, primary, compute]);

  const clock = <Icon.Clock className="h-[15px] w-[15px] shrink-0" strokeWidth={2.2} />;

  // --- State: no verified deadline for this matter → honest, calm "can't confirm". ---
  if (!primary) {
    return (
      <Shell>
        <Eyebrow icon={clock}>Time limits</Eyebrow>
        <p className="mt-2.5 text-[15.5px] leading-relaxed text-ink-soft">
          A time limit applies to this kind of decision, and it can be short. We can&rsquo;t
          confirm the exact date here — check it with a free service, and don&rsquo;t wait.
        </p>
        <Link href="/help" className="link-text mt-2 inline-flex min-h-[44px] items-center">
          Who can confirm my date →
        </Link>
      </Shell>
    );
  }

  const confirmed = result?.renderable ? result : null;

  return (
    <Shell>
      <Eyebrow icon={clock}>Your time limit to apply</Eyebrow>

      {confirmed ? (
        <>
          <p className="mt-2.5 font-display text-[19px] font-extrabold leading-snug text-ink">
            {confirmed.passed
              ? `This date has passed (${formatLong(confirmed.deadlineDate)}).`
              : `Apply by ${formatLong(confirmed.deadlineDate)}.`}
          </p>
          <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">
            {confirmed.passed
              ? "A free service can tell you if anything can still be done."
              : `For ${primary.name.toLowerCase()}. A free service can confirm the exact date for your situation.`}
          </p>

          {confirmed.howCounted && (
            <p className="mt-3 text-[14.5px] leading-relaxed text-ink-soft">
              How it&rsquo;s counted: {confirmed.howCounted}.
            </p>
          )}

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            {ics && (
              <button
                type="button"
                className="btn btn-secondary w-full sm:w-auto"
                onClick={() => downloadIcs(ics)}
              >
                <Icon.CalendarPlus className="h-[18px] w-[18px]" strokeWidth={1.9} />
                Add a reminder to my calendar
              </button>
            )}
            <button
              type="button"
              className="link-text min-h-[44px]"
              onClick={() => setShowHow((v) => !v)}
            >
              How this date works
            </button>
          </div>
          {showHow && (
            <p className="mt-3 rounded-input border border-amber-border bg-paper p-3.5 text-[14.5px] leading-relaxed text-ink-soft">
              We count every day from the date on your notice or decision. If the last day falls
              on a weekend or public holiday it may move to the next business day — a free service
              can confirm the exact date for you.
            </p>
          )}
          <SourceLine source={confirmed.source} />
        </>
      ) : (
        // --- State: we can compute a date, but need the decision date first. ---
        <>
          <p className="mt-2.5 text-[15.5px] leading-relaxed text-ink-soft">
            There is a time limit for this step. If it helps, enter the date on your notice or
            decision and we&rsquo;ll work out the date — you can add a reminder.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex-1">
              <span className="mb-1.5 block text-[14.5px] font-semibold text-ink">
                Date on your notice / decision
              </span>
              <input
                type="date"
                max={today}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input"
              />
            </label>
            <button
              type="button"
              className="btn btn-secondary w-full sm:w-auto"
              disabled={!date || busy}
              onClick={() => void compute(date)}
            >
              {busy ? "Working it out…" : "Work out my date"}
            </button>
          </div>
          <SourceLine source={primary.source} />
        </>
      )}
    </Shell>
  );
}
