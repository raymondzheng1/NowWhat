"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { EntrySummary } from "@/lib/corpus/summary";
import type { DeadlineResult } from "@/lib/deadline/compute";
import type { Draft } from "@/lib/draft/build";
import { SourcesPanel } from "@/components/ui/SourcesPanel";
import { GetHelp } from "@/components/ui/GetHelp";
import { postDeadline, postDraft } from "@/components/feature/api";

function downloadText(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * The shared "what now" actions for a matched corpus entry: the review pathways, the
 * deadline calculator (verified-only), the editable draft, sources, and get-help.
 * Reused by both the Ask and Decode results (one core, harness §3.1).
 */
export function EntryActions({ entry }: { entry: EntrySummary }) {
  const td = useTranslations("deadline");
  const tdr = useTranslations("draft");
  const tc = useTranslations("common");
  const th = useTranslations("help");

  const [decisionDate, setDecisionDate] = useState("");
  const [deadlines, setDeadlines] = useState<Record<string, { result: DeadlineResult; ics?: string }>>({});
  const [computing, setComputing] = useState(false);

  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftContext, setDraftContext] = useState("");
  const [draftBusy, setDraftBusy] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  async function computeAll() {
    if (!decisionDate) return;
    setComputing(true);
    const out: Record<string, { result: DeadlineResult; ics?: string }> = {};
    for (const p of entry.pathways) {
      const r = await postDeadline(entry.id, p.name, decisionDate);
      if (r.ok) out[p.name] = { result: r.deadline, ics: r.ics };
    }
    setDeadlines(out);
    setComputing(false);
  }

  async function makeDraft(kind: "reasons-request" | "review-application") {
    setDraftBusy(true);
    const r = await postDraft(entry.id, kind, draftContext || undefined);
    if (r.ok) setDraft(r.draft);
    setDraftBusy(false);
  }

  return (
    <div className="space-y-6">
      {/* Pathways + deadline */}
      <section className="card">
        <h2 className="font-display text-xl font-bold text-ink">{td("title")}</h2>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1">
            <span className="mb-1 block text-sm font-medium text-ink">{td("decisionDateLabel")}</span>
            <input
              type="date"
              max={today}
              value={decisionDate}
              onChange={(e) => setDecisionDate(e.target.value)}
              className="w-full rounded-card border border-line px-3 py-2"
            />
          </label>
          <button className="btn-primary" onClick={computeAll} disabled={!decisionDate || computing}>
            {computing ? tc("loading") : td("compute")}
          </button>
        </div>

        <ul className="mt-5 space-y-4">
          {entry.pathways.map((p) => {
            const d = deadlines[p.name]?.result;
            return (
              <li key={p.name} className="rounded-card border border-line p-4">
                <p className="font-semibold text-ink">{p.name}</p>
                <p className="text-sm text-ink-soft">{p.body}{p.cost ? ` · ${p.cost}` : ""}</p>
                <p className="mt-1 text-sm text-ink-soft">{p.howToStart}</p>

                {d ? (
                  d.renderable ? (
                    <div className="mt-3 rounded-card bg-clock-soft p-3 text-clock-ink">
                      <p className="font-semibold">
                        {td("renderableLead")}: <span className="font-bold">{d.deadlineDate}</span>
                      </p>
                      <p className="text-sm">{td("daysRemaining", { days: d.daysRemaining })}</p>
                      {d.howCounted ? <p className="text-xs">{td("howCounted", { howCounted: d.howCounted })}</p> : null}
                      {d.passed ? <p className="mt-1 text-sm font-medium">{td("passedWarning")}</p> : null}
                      {deadlines[p.name]?.ics ? (
                        <button
                          className="btn-secondary mt-3 py-2 text-sm"
                          onClick={() =>
                            downloadText("deadline-reminder.ics", deadlines[p.name]!.ics!, "text/calendar")
                          }
                        >
                          {td("addReminder")}
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    <div className="mt-3 rounded-card bg-clock-soft p-3 text-clock-ink">
                      <p className="font-semibold">{td("unverifiedTitle")}</p>
                      <p className="text-sm">{d.message}</p>
                    </div>
                  )
                ) : (
                  <p className="mt-2 text-sm text-ink-faint">{p.deadline}</p>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* Evidence / grounds */}
      {(entry.evidenceChecklist.length > 0 || entry.groundsOrCriteria.length > 0) && (
        <section className="card">
          {entry.groundsOrCriteria.length > 0 && (
            <>
              <h3 className="font-display text-lg font-bold text-ink">What this can turn on</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-soft">
                {entry.groundsOrCriteria.map((g, i) => <li key={i}>{g}</li>)}
              </ul>
            </>
          )}
          {entry.evidenceChecklist.length > 0 && (
            <>
              <h3 className="mt-4 font-display text-lg font-bold text-ink">What can help</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-soft">
                {entry.evidenceChecklist.map((g, i) => <li key={i}>{g}</li>)}
              </ul>
            </>
          )}
        </section>
      )}

      {/* Draft */}
      <section className="card">
        <h2 className="font-display text-xl font-bold text-ink">{tdr("title")}</h2>
        <p className="mt-2 text-sm text-ink-soft">{tdr("intro")}</p>
        <label className="mt-3 block">
          <span className="mb-1 block text-sm font-medium text-ink">{tdr("contextLabel")}</span>
          <textarea
            value={draftContext}
            onChange={(e) => setDraftContext(e.target.value)}
            placeholder={tdr("contextPlaceholder")}
            rows={3}
            className="w-full rounded-card border border-line px-3 py-2"
          />
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn-secondary py-2 text-sm" onClick={() => makeDraft("reasons-request")} disabled={draftBusy}>
            {tdr("reasonsRequest")}
          </button>
          <button className="btn-secondary py-2 text-sm" onClick={() => makeDraft("review-application")} disabled={draftBusy}>
            {tdr("reviewApplication")}
          </button>
        </div>

        {draft && (
          <div className="mt-4">
            <p className="mb-1 text-sm text-ink-faint">{tdr("editNote")}</p>
            <textarea
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              rows={16}
              className="w-full rounded-card border border-line p-3 font-mono text-sm"
            />
            <div className="mt-2 flex gap-2">
              <button className="btn-secondary py-2 text-sm" onClick={() => downloadText(draft.filename, draft.body)}>
                {tc("download")}
              </button>
              <button className="btn-secondary py-2 text-sm" onClick={() => window.print()}>
                {tc("print")}
              </button>
            </div>
          </div>
        )}
      </section>

      <SourcesPanel sources={entry.sources} lastVerified={entry.lastVerified} />
      <GetHelp services={entry.getHelp} title={th("forThis")} />
    </div>
  );
}
