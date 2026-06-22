"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { postDecodeText, postDecodeFile, type DecodeResponse } from "@/components/feature/api";
import { ResultView } from "@/components/feature/ResultView";
import { NotCovered } from "@/components/feature/NotCovered";
import { ToolTopBar } from "@/components/site/ToolTopBar";
import { PrivacyNote } from "@/components/ui/PrivacyNote";
import { CATEGORY } from "@/components/feature/categories";

export function DecodeClient() {
  const t = useTranslations("decode");
  const tc = useTranslations("common");
  const te = useTranslations("errors");

  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DecodeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const msg = (m: string) => (m.startsWith("errors.") ? te(m.slice(7)) : m);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file && text.trim().length < 10) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r =
        text.trim().length >= 10
          ? await postDecodeText(text.trim())
          : await postDecodeFile(file as File);
      if (r.ok) setResult(r);
      else setError(msg(r.message));
    } catch {
      setError(te("generic"));
    } finally {
      setLoading(false);
    }
  }

  if (result?.ok && result.status === "answered") {
    return (
      <ResultView
        entry={result.entry}
        category={CATEGORY[result.entry.id] ?? result.entry.title}
        answer={result.decode.whatItIs}
        about={result.decode.whatItMeans}
        options={result.decode.options}
        isFallback={result.isFallback}
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
            <label htmlFor="file" className="mb-1.5 block font-semibold text-ink">
              {t("uploadLabel")}
            </label>
            <input id="file" type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block w-full text-sm" />

            <label htmlFor="text" className="mb-1.5 mt-5 block font-semibold text-ink">
              {t("pasteLabel")}
            </label>
            <textarea
              id="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t("pastePlaceholder")}
              rows={6}
              className="input leading-relaxed"
            />

            <button type="submit" className="btn-primary btn-lg mt-4 w-full sm:w-auto" disabled={loading || (!file && text.trim().length < 10)}>
              {loading ? tc("loading") : t("submit")}
            </button>
            <PrivacyNote className="mt-4">{t("intro")}</PrivacyNote>
          </form>

          {error && (
            <div role="alert" className="card mt-4 border-l-[3px] border-gold bg-gold-soft text-gold-strong">
              {error}
            </div>
          )}

          {result?.ok && result.status === "ocr-unavailable" && (
            <div className="card mt-4">
              <h2 className="font-serif text-h3 font-bold text-ink">{t("ocrUnavailableTitle")}</h2>
              <p className="mt-2 text-ink-soft">{t("ocrUnavailableBody")}</p>
            </div>
          )}

          {result?.ok && result.status === "not-covered" && (
            <div className="mt-6">
              <NotCovered title={t("notCoveredTitle")} body={t("notCoveredBody")} services={result.getHelp} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
