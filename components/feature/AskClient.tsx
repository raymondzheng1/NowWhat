"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { postAsk, type AskResponse } from "@/components/feature/api";
import { ResultView } from "@/components/feature/ResultView";
import { NotCovered } from "@/components/feature/NotCovered";
import { ToolTopBar } from "@/components/site/ToolTopBar";
import { PrivacyNote } from "@/components/ui/PrivacyNote";
import { CATEGORY } from "@/components/feature/categories";
import { useTour } from "@/components/feature/tour/useTour";
import { TOUR_ASK } from "@/lib/tour/steps";

export function AskClient() {
  const t = useTranslations("ask");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const tt = useTranslations("tour");

  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const msg = (m: string) => (m.startsWith("errors.") ? te(m.slice(7)) : m);

  // Guide fires at the threshold of the work — only while the form is on screen.
  const replayGuide = useTour("ask", TOUR_ASK, !result);

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
        answer={result.answer.restated || result.entry.title}
        body={result.answer.answer}
        options={result.answer.nextStep ? [result.answer.nextStep] : []}
        backLabel={t("another")}
        onBack={() => {
          setResult(null);
          setQuestion("");
        }}
      />
    );
  }

  return (
    <>
      <ToolTopBar />
      <div className="min-h-[60vh]">
        <div className="container-prose py-10">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-h1">{t("title")}</h1>
            <button
              type="button"
              onClick={replayGuide}
              className="link-text mt-2 min-h-[44px] shrink-0"
            >
              {tt("showMe")}
            </button>
          </div>
          <p className="mt-2 text-ink-soft">{t("intro")}</p>

          {/* The question card is a white sticker laid on the paper. */}
          <form
            onSubmit={submit}
            className="card sticker mt-7"
            style={{ "--rot": "-0.7deg" } as React.CSSProperties}
          >
            <label
              htmlFor="q"
              className="mb-2 block font-display text-[13px] font-black uppercase tracking-[0.1em] text-ink"
            >
              {t("yourQuestion")}
            </label>
            <textarea
              id="q"
              data-tour="ask-input"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={t("placeholder")}
              rows={4}
              className="input leading-relaxed"
            />
            <button
              type="submit"
              data-tour="ask-submit"
              className="btn btn-primary btn-lg mt-5 w-full sm:w-auto"
              disabled={loading || question.trim().length < 3}
            >
              {loading ? tc("loading") : t("submit")}
            </button>
          </form>

          {error && (
            <div role="alert" className="card mt-5 border-2 border-red text-ink">
              {error}
            </div>
          )}

          {result?.ok && result.status === "not-covered" && (
            <div className="mt-7">
              <NotCovered title={t("notCoveredTitle")} body={t("notCoveredBody")} services={result.getHelp} />
            </div>
          )}

          <PrivacyNote className="mt-7">We read your question on the spot and never store it.</PrivacyNote>
        </div>
      </div>
    </>
  );
}
