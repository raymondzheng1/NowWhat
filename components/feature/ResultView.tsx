"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { EntrySummary } from "@/lib/corpus/summary";
import type { Draft } from "@/lib/draft/build";
import { Crest } from "@/components/ui/Wordmark";
import { Icon } from "@/components/ui/icons";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { SourcesPanel } from "@/components/ui/SourcesPanel";
import { PrivacyNote } from "@/components/ui/PrivacyNote";
import { DeadlineCard } from "@/components/feature/DeadlineCard";
import { TieredHelp } from "@/components/feature/TieredHelp";
import { Markdown } from "@/components/ui/Markdown";
import { postDraft } from "@/components/feature/api";

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type DraftKind = "reasons-request" | "review-application";

export interface ResultViewProps {
  entry: EntrySummary;
  /** Eyebrow category, e.g. "Renting · Notice to vacate". */
  category: string;
  /** The serif headline answer/statement — keep it short; it renders as the H1. */
  answer: string;
  /** The "What this is about" paragraph (decode/wizard). Ignored when `body` is set. */
  about?: string;
  /** A full Markdown answer body (ask) — rendered as readable prose in place of `about`. */
  body?: string;
  /** Optional extra options/next-step lines (decode). */
  options?: string[];
  /** Prefill the deadline card (from the wizard's Step 2). */
  decisionDate?: string;
  isFallback?: boolean;
  /** Header back control: label + handler for returning to the flow that made this result
   *  (e.g. "Ask another question" resets the ask form). Falls back to a /start link. */
  backLabel?: string;
  onBack?: () => void;
}

/**
 * The Result experience — shared by the wizard, /ask and /decode. A focused header bar,
 * then the answer laid out as a few stickers on paper: the answer card, the calm amber
 * time limit, what can help, and the draft letter; with a sticky rail of sources, the
 * foil "get free help" card, and the privacy line. The deadline, sources, disclaimer and
 * get-help are always rendered (load-bearing trust surfaces).
 *
 * Sticker budget for this screen: exactly one foil (the free-help card in the rail), one
 * handwritten note ("Gather what you can:"), and the dashed empty slot only when we had
 * to fall back to a general guide — i.e. when the exact pathway is missing from the album.
 */
export function ResultView({
  entry,
  category,
  answer,
  about = "",
  body,
  options = [],
  decisionDate,
  isFallback = false,
  backLabel,
  onBack,
}: ResultViewProps) {
  const [kind, setKind] = useState<DraftKind>("reasons-request");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let live = true;
    void postDraft(entry.id, kind).then((r) => {
      if (live && r.ok) {
        setDraft(r.draft);
        setEditing(false);
      }
    });
    return () => {
      live = false;
    };
  }, [entry.id, kind]);

  const backClass =
    "inline-flex min-h-[44px] min-w-0 items-center gap-2 font-display text-[13px] font-extrabold uppercase tracking-[0.06em] text-ink hover:text-red-ink";
  const toggleClass = (on: boolean) =>
    `inline-flex min-h-[44px] items-center rounded-pill px-4 font-display text-[13px] font-extrabold uppercase tracking-[0.06em] ${
      on ? "bg-ink text-cream" : "border border-line text-ink-faint hover:text-ink"
    }`;

  return (
    <div>
      {/* Focused result header */}
      <div className="sticky top-0 z-30 flex h-[52px] items-center justify-between gap-3 border-b-2 border-ink bg-paper px-[18px] sm:h-16 sm:px-9">
        {onBack ? (
          <button type="button" onClick={onBack} className={backClass}>
            ← <span className="truncate">{backLabel ?? "Start over"}</span>
          </button>
        ) : (
          <Link href="/start" className={backClass}>
            ← <span className="truncate">{backLabel ?? "Start over"}</span>
          </Link>
        )}
        <span className="hidden sm:inline">
          <Crest size={28} />
        </span>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex shrink-0 items-center gap-2 rounded-button border-2 border-ink bg-paper px-3.5 font-display text-[13px] font-extrabold uppercase tracking-[0.06em] text-ink hover:bg-cream"
          style={{ minHeight: 44 }}
        >
          <Icon.Printer className="h-4 w-4" strokeWidth={2} /> Print
        </button>
      </div>

      <div>
        <div className="mx-auto grid max-w-6xl gap-6 px-[18px] py-7 sm:px-9 sm:py-9 lg:grid-cols-[1.7fr_1fr] lg:gap-9">
          {/* MAIN */}
          <div className="min-w-0 space-y-6">
            <div>
              <span className="eyebrow text-ink-faint">{category}</span>
              <h1 className="mt-2.5 font-display text-[24px] font-black leading-[1.1] text-ink sm:text-h2">
                {answer}
              </h1>
            </div>

            <section className="card">
              {body ? (
                <Markdown>{body}</Markdown>
              ) : (
                <>
                  <h2 className="font-display text-[21px] font-black leading-tight text-ink">
                    What this is about
                  </h2>
                  {about && (
                    <p className="mt-3 text-[17px] leading-relaxed text-ink-soft">{about}</p>
                  )}
                </>
              )}
              {options.length > 0 && (
                <ul className="mt-3.5 list-disc space-y-1.5 pl-5 text-[17px] leading-relaxed text-ink-soft marker:text-red">
                  {options.map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ul>
              )}
              {isFallback && (
                /* Empty slot: the exact pathway isn't in the album yet. */
                <p className="slot-empty mt-4 p-3.5 text-[14.5px] leading-relaxed text-ink-soft">
                  We matched this to a general guide. A free service can confirm the exact steps
                  for your situation.
                </p>
              )}
              <Disclaimer className="mt-4" />
            </section>

            <DeadlineCard entry={entry} decisionDate={decisionDate} />

            {entry.evidenceChecklist.length > 0 && (
              <section
                className="card sticker"
                style={{ "--rot": "-0.7deg" } as React.CSSProperties}
              >
                <h2 className="font-display text-[21px] font-black leading-tight text-ink">
                  What can help your case
                </h2>
                {/* Handwritten aside — but this line is the checklist's only instruction,
                    so it takes ink-soft (7.8:1) rather than `.note`'s tan (4.2:1), and no
                    rotation of its own: the card it sits in is already tilted. */}
                <p className="mt-1.5 font-note text-[23px] font-semibold leading-tight text-ink-soft">
                  Gather what you can:
                </p>
                <ul className="mt-2.5 space-y-2.5">
                  {entry.evidenceChecklist.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <Icon.CheckSquare className="mt-0.5 h-5 w-5 shrink-0 text-help" strokeWidth={2} />
                      <span className="text-[17px] leading-snug text-ink-soft">{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Draft */}
            <section className="card sticker" style={{ "--rot": "0.6deg" } as React.CSSProperties}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-[21px] font-black leading-tight text-ink">
                  A draft letter to start with
                </h2>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing((v) => !v)}
                    className="inline-flex items-center rounded-button border-2 border-ink bg-paper px-4 font-display text-[13px] font-extrabold uppercase tracking-[0.06em] text-ink hover:bg-cream"
                    style={{ minHeight: 44 }}
                  >
                    {editing ? "Done" : "Edit"}
                  </button>
                  <button
                    type="button"
                    onClick={() => draft && downloadText(draft.filename, draft.body)}
                    className="inline-flex items-center rounded-button px-4 font-display text-[13px] font-extrabold uppercase tracking-[0.06em] text-cream-onRed shadow-chip transition-shadow hover:shadow-sticker"
                    style={{ minHeight: 44, background: "var(--red-cta)" }}
                  >
                    Download
                  </button>
                </div>
              </div>
              <div className="mt-3.5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setKind("reasons-request")}
                  aria-pressed={kind === "reasons-request"}
                  className={toggleClass(kind === "reasons-request")}
                >
                  Ask for reasons
                </button>
                <button
                  type="button"
                  onClick={() => setKind("review-application")}
                  aria-pressed={kind === "review-application"}
                  className={toggleClass(kind === "review-application")}
                >
                  Apply for review
                </button>
              </div>
              {draft && (
                editing ? (
                  <textarea
                    value={draft.body}
                    onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                    rows={14}
                    className="mt-3.5 w-full rounded-input border-2 border-line bg-cream p-4 font-mono text-[14.5px] leading-relaxed text-ink"
                  />
                ) : (
                  <div className="mt-3.5 whitespace-pre-wrap rounded-input border-2 border-line bg-cream p-4 font-mono text-[14.5px] leading-relaxed text-ink">
                    {draft.body}
                  </div>
                )
              )}
            </section>
          </div>

          {/* RAIL */}
          <div className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-[84px] lg:self-start">
            <div className="order-1 lg:order-2">
              <TieredHelp entryId={entry.id} entryTitle={entry.title} services={entry.getHelp} />
            </div>
            <div className="order-2 lg:order-1">
              <SourcesPanel sources={entry.sources} lastVerified={entry.lastVerified} />
            </div>
            <div className="order-3 rounded-card border border-line bg-cream px-4 py-3.5">
              <PrivacyNote>Nothing on this page was saved. Close the tab and it&rsquo;s gone.</PrivacyNote>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
