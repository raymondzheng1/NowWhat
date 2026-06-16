"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { postAsk, type AskResponse } from "@/components/feature/api";
import { EntryActions } from "@/components/feature/EntryActions";
import { NotCovered } from "@/components/feature/NotCovered";
import { ByoKeyField } from "@/components/feature/ByoKeyField";
import { Disclaimer } from "@/components/ui/Disclaimer";

export function AskClient() {
  const t = useTranslations("ask");
  const tc = useTranslations("common");
  const te = useTranslations("errors");

  const [question, setQuestion] = useState("");
  const [byoKey, setByoKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  function msg(m: string): string {
    return m.startsWith("errors.") ? te(m.slice(7)) : m;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (question.trim().length < 3) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await postAsk(question.trim(), byoKey || undefined);
      if (r.ok) setResult(r);
      else setError(msg(r.message));
    } catch {
      setError(te("generic"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="card">
        <label htmlFor="q" className="mb-1 block font-medium text-ink">
          {t("yourQuestion")}
        </label>
        <textarea
          id="q"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={t("placeholder")}
          rows={4}
          className="w-full rounded-card border border-line px-3 py-2"
        />
        <ByoKeyField value={byoKey} onChange={setByoKey} />
        <button type="submit" className="btn-primary mt-3" disabled={loading || question.trim().length < 3}>
          {loading ? tc("loading") : t("submit")}
        </button>
      </form>

      {error && (
        <div role="alert" className="card border-danger/30 bg-clock-soft text-clock-ink">
          {error}
        </div>
      )}

      {result?.ok && result.status === "answered" && (
        <div className="space-y-6">
          <div className="card">
            {result.answer.restated && (
              <p className="text-sm text-ink-faint">{result.answer.restated}</p>
            )}
            <h2 className="mt-1 font-display text-xl font-bold text-ink">{t("answer")}</h2>
            <p className="mt-2 whitespace-pre-line text-ink-soft">{result.answer.answer}</p>
            {result.answer.nextStep && (
              <>
                <h3 className="mt-4 font-display text-lg font-semibold text-ink">{t("nextStep")}</h3>
                <p className="mt-1 text-ink-soft">{result.answer.nextStep}</p>
              </>
            )}
            <Disclaimer className="mt-4" />
          </div>
          <EntryActions entry={result.entry} />
        </div>
      )}

      {result?.ok && result.status === "not-covered" && (
        <NotCovered title={t("notCoveredTitle")} body={t("notCoveredBody")} services={result.getHelp} />
      )}
    </div>
  );
}
