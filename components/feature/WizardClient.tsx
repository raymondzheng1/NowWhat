"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { EntrySummary } from "@/lib/corpus/summary";
import { postClassify } from "@/components/feature/api";
import { EntryActions } from "@/components/feature/EntryActions";
import { NotCovered } from "@/components/feature/NotCovered";
import { Disclaimer } from "@/components/ui/Disclaimer";

type Step = "choose" | "paste" | "details" | "result" | "not-covered";

/**
 * Step-by-step guided intake (the FairGo-style structured flow). The result is built
 * deterministically from the matched corpus entry — grounded, model-free, and works
 * even without an API key. The user's inputs are never stored.
 */
export function WizardClient({ entries }: { entries: EntrySummary[] }) {
  const t = useTranslations("wizard");
  const generic = entries.find((e) => e.id === "vic-generic");

  const [step, setStep] = useState<Step>("choose");
  const [selected, setSelected] = useState<EntrySummary | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const [decisionDate, setDecisionDate] = useState("");
  const [context, setContext] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [classifying, setClassifying] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  function chooseArea(entry: EntrySummary) {
    setSelected(entry);
    setIsFallback(entry.id === "vic-generic");
    setStep("details");
  }

  async function classifyPasted() {
    if (pasteText.trim().length < 5) return;
    setClassifying(true);
    const r = await postClassify(pasteText.trim());
    setClassifying(false);
    if (r.ok && r.status === "matched") {
      const entry = entries.find((e) => e.id === r.entryId) ?? generic ?? null;
      setSelected(entry);
      setIsFallback(r.isFallback || entry?.id === "vic-generic");
      setStep(entry ? "details" : "not-covered");
    } else {
      setStep("not-covered");
    }
  }

  function reset() {
    setSelected(null);
    setIsFallback(false);
    setDecisionDate("");
    setContext("");
    setPasteText("");
    setStep("choose");
  }

  // --- Step: choose an area ---
  if (step === "choose") {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-ink">{t("step1Title")}</h2>
          <p className="mt-1 text-ink-soft">{t("step1Help")}</p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {entries.map((e) => (
            <li key={e.id}>
              <button
                onClick={() => chooseArea(e)}
                className="card block w-full text-left hover:border-brand"
              >
                <span className="font-semibold text-brand-ink">{e.title}</span>
              </button>
            </li>
          ))}
        </ul>
        <button onClick={() => setStep("paste")} className="link text-sm">
          {t("pasteOption")}
        </button>
      </div>
    );
  }

  // --- Step: paste a letter ---
  if (step === "paste") {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-ink">{t("pasteTitle")}</h2>
          <p className="mt-1 text-ink-soft">{t("pasteHelp")}</p>
        </div>
        <textarea
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          placeholder={t("pastePlaceholder")}
          rows={8}
          className="w-full rounded-card border border-line px-3 py-2"
        />
        <div className="flex gap-2">
          <button onClick={() => setStep("choose")} className="btn-secondary py-2">{t("back")}</button>
          <button
            onClick={classifyPasted}
            className="btn-primary py-2"
            disabled={classifying || pasteText.trim().length < 5}
          >
            {classifying ? "…" : t("pasteSubmit")}
          </button>
        </div>
      </div>
    );
  }

  // --- Step: details (date + optional context) ---
  if (step === "details" && selected) {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="font-display text-2xl font-bold text-ink">{t("step2Title")}</h2>
          <p className="mt-1 text-ink-soft">{t("step2Help")}</p>
        </div>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink">{t("dateLabel")}</span>
          <input
            type="date"
            max={today}
            value={decisionDate}
            onChange={(e) => setDecisionDate(e.target.value)}
            className="w-full rounded-card border border-line px-3 py-2 sm:w-auto"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink">{t("contextLabel")}</span>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder={t("contextPlaceholder")}
            rows={3}
            className="w-full rounded-card border border-line px-3 py-2"
          />
        </label>
        <div className="flex gap-2">
          <button onClick={reset} className="btn-secondary py-2">{t("back")}</button>
          <button onClick={() => setStep("result")} className="btn-primary py-2">
            {t("seeResult")}
          </button>
        </div>
      </div>
    );
  }

  // --- Step: result ---
  if (step === "result" && selected) {
    return (
      <div className="space-y-6">
        <div className="card">
          <h2 className="font-display text-xl font-bold text-ink">{t("aboutThis")}</h2>
          <p className="mt-2 text-ink-soft">{selected.plainLanguageExplainer}</p>
          {isFallback && (
            <p className="mt-3 rounded-card bg-paper-sunk p-3 text-sm text-ink-soft">{t("fallbackNote")}</p>
          )}
          <Disclaimer className="mt-4" />
        </div>
        <EntryActions
          entry={selected}
          initialDecisionDate={decisionDate || undefined}
          initialContext={context || undefined}
        />
        <button onClick={reset} className="link text-sm">{t("startOver")}</button>
      </div>
    );
  }

  // --- Step: not covered ---
  return (
    <div className="space-y-4">
      <NotCovered
        title={t("notCoveredTitle")}
        body={t("notCoveredBody")}
        services={generic?.getHelp ?? []}
      />
      <button onClick={reset} className="link text-sm">{t("startOver")}</button>
    </div>
  );
}
