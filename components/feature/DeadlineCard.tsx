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

/** Outer gold double-rule frame shared by every state (the signature panel). */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-panel border border-gold-line bg-gold-soft p-1.5 shadow-deadline">
      <div className="rounded-icon border border-gold-line2 p-5 sm:p-6">{children}</div>
    </div>
  );
}

function GoldEyebrow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[11.5px] font-bold uppercase tracking-[0.12em] text-brass-text">
      {icon}
      {children}
    </div>
  );
}

/**
 * The signature deadline panel (handoff non-negotiable #3). Gold/amber, never red.
 * Three calm states: a confirmed date, an inline "enter your date" prompt, and the
 * honest "we couldn't confirm the exact date" outcome. The verified-only guarantee is
 * enforced upstream (deadlineIsRenderable + the verifier) — this only renders what it's given.
 */
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

  // --- State: no verified deadline for this matter → honest "can't confirm". ---
  if (!primary) {
    return (
      <Frame>
        <GoldEyebrow icon={<Icon.Warning className="h-[17px] w-[17px] text-gold" strokeWidth={2} />}>
          A time limit applies
        </GoldEyebrow>
        <p className="mt-3 font-serif text-[23px] font-bold leading-snug text-gold-strong">
          There&rsquo;s a deadline here — but we couldn&rsquo;t confirm the exact date.
        </p>
        <p className="mt-2.5 text-[15px] leading-relaxed text-gold-text">
          Time limits for this kind of decision are often short. To be safe, treat it as urgent
          and check the exact date with a free service today.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link href="/help" className="btn-help w-full sm:w-auto">
            Who can confirm my date →
          </Link>
          <button
            type="button"
            className="w-full rounded-button border border-gold-line bg-paper px-5 font-semibold text-gold sm:w-auto"
            style={{ minHeight: 50 }}
            onClick={() => setShowHow((v) => !v)}
          >
            Why we&rsquo;re not sure
          </button>
        </div>
        {showHow && (
          <p className="mt-3 rounded-input border border-gold-line2 bg-paper p-3 text-[13.5px] leading-relaxed text-gold-text">
            We only show a date when we can ground it in a verified rule for your exact
            situation. Here, the time limit depends on details a free service can check with you.
          </p>
        )}
      </Frame>
    );
  }

  const confirmed = result?.renderable ? result : null;

  return (
    <Frame>
      <GoldEyebrow icon={<Icon.Clock className="h-[17px] w-[17px] text-gold" strokeWidth={2} />}>
        Your time limit to apply
      </GoldEyebrow>

      {confirmed ? (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-6">
            <div className="min-w-[200px] flex-1">
              <div className="font-serif text-[34px] font-bold leading-[1.12] text-gold-strong">
                {formatLong(confirmed.deadlineDate)}
              </div>
              <p className="mt-2 text-[14.5px] text-gold-text">
                {confirmed.passed
                  ? "This date has passed — a free service can tell you if anything can still be done."
                  : `Apply by this date — ${primary.name.toLowerCase()}.`}
              </p>
            </div>
            <div className="rounded-icon border border-gold-line bg-paper px-6 py-4 text-center">
              <div className="font-serif text-[44px] font-bold leading-none text-gold">
                {Math.max(0, confirmed.daysRemaining)}
              </div>
              <div className="mt-1 text-[12px] font-bold uppercase tracking-[0.08em] text-gold-text">
                days left
              </div>
            </div>
          </div>

          {confirmed.howCounted && (
            <div className="mt-4 rounded-input border border-[#ecdcb6] bg-paper p-3 text-[13.5px] leading-relaxed text-gold-text">
              <strong className="text-gold-strong">How it&rsquo;s counted:</strong> {confirmed.howCounted}.
              A free service can confirm the exact date for your situation.
            </div>
          )}

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {ics && (
              <button
                type="button"
                className="btn-deadline w-full sm:w-auto"
                style={{ minHeight: 50 }}
                onClick={() => downloadIcs(ics)}
              >
                <Icon.CalendarPlus className="h-[18px] w-[18px]" strokeWidth={1.9} />
                Add a reminder to my calendar
              </button>
            )}
            <button
              type="button"
              className="w-full rounded-button border border-gold-line bg-paper px-5 font-semibold text-gold sm:w-auto"
              style={{ minHeight: 50 }}
              onClick={() => setShowHow((v) => !v)}
            >
              How this date works
            </button>
          </div>
          {showHow && (
            <p className="mt-3 rounded-input border border-gold-line2 bg-paper p-3 text-[13.5px] leading-relaxed text-gold-text">
              We count every day from the date on your notice or decision. If the last day falls
              on a weekend or public holiday it may move to the next business day — a free service
              can confirm the exact date for you.
            </p>
          )}
        </>
      ) : (
        // --- State: we can compute a date, but need the decision date first. ---
        <>
          <p className="mt-3 text-[15px] leading-relaxed text-gold-text">
            There is a time limit for this step. Enter the date on your notice or decision letter
            and we&rsquo;ll work out your exact deadline.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex-1">
              <span className="mb-1.5 block text-[13px] font-semibold text-gold-strong">
                Date on your notice / decision
              </span>
              <input
                type="date"
                max={today}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input border-gold-line"
              />
            </label>
            <button
              type="button"
              className="btn-deadline w-full sm:w-auto"
              style={{ minHeight: 50 }}
              disabled={!date || busy}
              onClick={() => void compute(date)}
            >
              {busy ? "Working it out…" : "Work out my date"}
            </button>
          </div>
        </>
      )}
    </Frame>
  );
}
