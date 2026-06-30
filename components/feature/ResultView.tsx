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
}

/**
 * The Result experience (Direction C) — shared by the wizard, /ask and /decode. Focused
 * header, two-column main + sticky rail on desktop, stacked on mobile. The deadline,
 * sources, disclaimer and get-help are always rendered (load-bearing trust surfaces).
 * "Two flavours, one page": the header `answer`/`about` may be written (ask/decode) or
 * the corpus explainer (wizard) — the lower blocks are identical.
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

  return (
    <div>
      {/* Focused result header */}
      <div className="sticky top-0 z-30 flex h-[52px] items-center justify-between border-b-2 border-navy bg-paper px-[18px] sm:h-16 sm:px-9">
        <Link href="/start" className="inline-flex items-center gap-2 text-sm font-semibold text-navy hover:underline">
          ← Start over
        </Link>
        <span className="hidden sm:inline">
          <Crest size={28} />
        </span>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-button border border-line px-3.5 text-sm font-medium text-ink-soft hover:bg-paper-sunk"
          style={{ minHeight: 40 }}
        >
          <Icon.Printer className="h-4 w-4" strokeWidth={1.8} /> Print
        </button>
      </div>

      <div className="bg-paper-warm">
        <div className="mx-auto grid max-w-6xl gap-6 px-[18px] py-6 sm:px-9 sm:py-9 lg:grid-cols-[1.7fr_1fr] lg:gap-9">
          {/* MAIN */}
          <div className="min-w-0 space-y-5">
            <div>
              <span className="eyebrow text-brass-text">{category}</span>
              <h1 className="mt-2.5 font-serif text-[22px] font-bold leading-tight text-navy-ink sm:text-h2">
                {answer}
              </h1>
            </div>

            <section className="card">
              {body ? (
                <Markdown>{body}</Markdown>
              ) : (
                <>
                  <h2 className="font-serif text-h3 font-bold text-ink">What this is about</h2>
                  {about && <p className="mt-2.5 text-[15px] leading-relaxed text-ink-soft">{about}</p>}
                </>
              )}
              {options.length > 0 && (
                <ul className="mt-3 list-disc space-y-1 pl-5 text-[15px] text-ink-soft">
                  {options.map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ul>
              )}
              {isFallback && (
                <p className="mt-3 rounded-input bg-paper-sunk p-3 text-sm text-ink-soft">
                  We matched this to a general guide. A free service can confirm the exact steps
                  for your situation.
                </p>
              )}
              <Disclaimer className="mt-3.5" />
            </section>

            <DeadlineCard entry={entry} decisionDate={decisionDate} />

            {entry.evidenceChecklist.length > 0 && (
              <section className="card">
                <h2 className="font-serif text-h3 font-bold text-ink">What can help your case</h2>
                <p className="mt-2 text-sm text-ink-soft">Gather what you can:</p>
                <ul className="mt-2.5 space-y-2.5">
                  {entry.evidenceChecklist.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <Icon.CheckSquare className="mt-0.5 h-5 w-5 shrink-0 text-help" strokeWidth={2} />
                      <span className="text-[15px] leading-snug text-ink-soft">{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Draft */}
            <section className="card">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-serif text-h3 font-bold text-ink">A draft letter to start with</h2>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing((v) => !v)}
                    className="inline-flex items-center rounded-button border-[1.5px] border-[#c3cad3] px-3.5 text-sm font-semibold text-navy"
                    style={{ minHeight: 40 }}
                  >
                    {editing ? "Done" : "Edit"}
                  </button>
                  <button
                    type="button"
                    onClick={() => draft && downloadText(draft.filename, draft.body)}
                    className="inline-flex items-center rounded-button bg-navy px-3.5 text-sm font-semibold text-white hover:bg-navy-dark"
                    style={{ minHeight: 40 }}
                  >
                    Download
                  </button>
                </div>
              </div>
              <div className="mt-3 flex gap-2 text-[13px]">
                <button
                  type="button"
                  onClick={() => setKind("reasons-request")}
                  className={`rounded-pill px-3 py-1 font-medium ${kind === "reasons-request" ? "bg-navy-soft text-navy" : "text-ink-faint hover:text-navy"}`}
                >
                  Ask for reasons
                </button>
                <button
                  type="button"
                  onClick={() => setKind("review-application")}
                  className={`rounded-pill px-3 py-1 font-medium ${kind === "review-application" ? "bg-navy-soft text-navy" : "text-ink-faint hover:text-navy"}`}
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
                    className="mt-3 w-full rounded-input border border-line bg-paper-warm p-4 font-serif text-sm leading-relaxed text-ink-soft"
                  />
                ) : (
                  <div className="mt-3 whitespace-pre-wrap rounded-input border border-line bg-paper-warm p-4 font-serif text-sm leading-relaxed text-ink-soft">
                    {draft.body}
                  </div>
                )
              )}
            </section>
          </div>

          {/* RAIL */}
          <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-[84px] lg:self-start">
            <div className="order-1 lg:order-2">
              <TieredHelp entryId={entry.id} entryTitle={entry.title} services={entry.getHelp} />
            </div>
            <div className="order-2 lg:order-1">
              <SourcesPanel sources={entry.sources} lastVerified={entry.lastVerified} />
            </div>
            <div className="order-3 rounded-icon border border-line bg-paper-warm p-3.5">
              <PrivacyNote>Nothing on this page was saved. Close the tab and it&rsquo;s gone.</PrivacyNote>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
