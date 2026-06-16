"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { postAsk, type AskResponse } from "@/components/feature/api";
import { ResultView } from "@/components/feature/ResultView";
import { NotCovered } from "@/components/feature/NotCovered";
import { ToolTopBar } from "@/components/site/ToolTopBar";
import { PrivacyNote } from "@/components/ui/PrivacyNote";
import { CATEGORY } from "@/components/feature/WizardClient";

export function AskClient() {
  const t = useTranslations("ask");
  const tc = useTranslations("common");
  const te = useTranslations("errors");

  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const msg = (m: string) => (m.startsWith("errors.") ? te(m.slice(7)) : m);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (question.trim().length < 3) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await postAsk(question.trim());
      if (r.ok) setResult(r);
      else setError(msg(r.message));
    } catch {
      setError(te("generic"));
    } finally {
      setLoading(false);
    }
  }

  // Answered → the shared focused Result screen (its own header).
  if (result?.ok && result.status === "answered") {
    return (
      <ResultView
        entry={result.entry}
        category={CATEGORY[result.entry.id] ?? result.entry.title}
        answer={result.answer.answer}
        about={result.answer.restated || result.entry.plainLanguageExplainer}
        options={result.answer.nextStep ? [result.answer.nextStep] : []}
      />
    );
  }

  return (
    <>
      <ToolTopBar />
      <div className="min-h-[60vh] bg-paper-warm">
        <div className="container-prose py-10">
          <h1 className="font-serif text-h1 font-bold text-navy-ink">{t("title")}</h1>
          <p className="mt-2 text-ink-soft">{t("intro")}</p>

          <form onSubmit={submit} className="card mt-6">
            <label htmlFor="q" className="mb-1.5 block font-semibold text-ink">
              {t("yourQuestion")}
            </label>
            <textarea
              id="q"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={t("placeholder")}
              rows={4}
              className="input leading-relaxed"
            />
            <button type="submit" className="btn-primary btn-lg mt-4 w-full sm:w-auto" disabled={loading || question.trim().length < 3}>
              {loading ? tc("loading") : t("submit")}
            </button>
          </form>

          {error && (
            <div role="alert" className="card mt-4 border-l-[3px] border-gold bg-gold-soft text-gold-strong">
              {error}
            </div>
          )}

          {result?.ok && result.status === "not-covered" && (
            <div className="mt-6">
              <NotCovered title={t("notCoveredTitle")} body={t("notCoveredBody")} services={result.getHelp} />
            </div>
          )}

          <PrivacyNote className="mt-6">We read your question on the spot and never store it.</PrivacyNote>
        </div>
      </div>
    </>
  );
}
