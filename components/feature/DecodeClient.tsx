"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { postDecodeText, postDecodeFile, type DecodeResponse, TimeoutError } from "@/components/feature/api";
import { ResultView } from "@/components/feature/ResultView";
import { NotCovered } from "@/components/feature/NotCovered";
import { ToolTopBar } from "@/components/site/ToolTopBar";
import { PrivacyNote } from "@/components/ui/PrivacyNote";
import { Busy } from "@/components/ui/Busy";
import { ErrorPanel } from "@/components/ui/ErrorPanel";
import { CATEGORY } from "@/components/feature/categories";
import { useTour } from "@/components/feature/tour/useTour";
import { TOUR_DECODE } from "@/lib/tour/steps";

export interface DecodeClientProps {
  /** Published answers per decision type, so the result can point at related reading. */
  faqsByEntry?: Record<string, { slug: string; question: string }[]>;
  /** Decision types that have a procedural pathway behind them. */
  pathwayIds?: string[];
}

export function DecodeClient({ faqsByEntry = {}, pathwayIds = [] }: DecodeClientProps = {}) {
  const t = useTranslations("decode");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const tt = useTranslations("tour");

  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DecodeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const msg = (m: string) => (m.startsWith("errors.") ? te(m.slice(7)) : m);

  // Guide fires at the threshold of the work — only while the form is on screen.
  const replayGuide = useTour("decode", TOUR_DECODE, !result);

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
    } catch (err) {
      // A stalled connection is not the same as a broken app; say which one it was.
      setError(err instanceof TimeoutError ? te("timeout") : te("generic"));
    } finally {
      setLoading(false);
    }
  }

  if (result?.ok && result.status === "answered") {
    return (
      <ResultView
        faqs={faqsByEntry[result.entry.id] ?? []}
        hasPathway={pathwayIds.includes(result.entry.id)}
        entry={result.entry}
        category={CATEGORY[result.entry.id] ?? result.entry.title}
        answer={result.decode.whatItIs}
        about={result.decode.whatItMeans}
        options={result.decode.options}
        isFallback={result.isFallback}
        backLabel={t("another")}
        onBack={() => {
          setResult(null);
          setText("");
          setFile(null);
        }}
      />
    );
  }

  return (
    <>
      <Busy show={loading} title={tc("busyReading")} />
      <ToolTopBar />
      <div className="min-h-[60vh]">
        <div className="container-prose py-10">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-h1">{t("title")}</h1>
            <button type="button" onClick={replayGuide} className="link-text mt-2 min-h-[44px] shrink-0">
              {tt("showMe")}
            </button>
          </div>
          <p className="mt-2 text-ink-soft">{t("intro")}</p>

          {/* The letter card is a white sticker: upload, or paste. Nothing is kept. */}
          <form
            onSubmit={submit}
            className="card sticker mt-7"
            style={{ "--rot": "0.6deg" } as React.CSSProperties}
          >
            <label
              htmlFor="file"
              className="mb-2 block font-display text-[13px] font-black uppercase tracking-[0.1em] text-ink"
            >
              {t("uploadLabel")}
            </label>
            <input
              id="file"
              data-tour="decode-upload"
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-[14.5px] text-ink-soft file:mr-3.5 file:min-h-[44px] file:cursor-pointer file:rounded-button file:border-0 file:bg-ink file:px-4 file:py-3.5 file:font-display file:text-[13px] file:font-extrabold file:uppercase file:tracking-[0.06em] file:text-cream"
            />

            <label
              htmlFor="text"
              className="mb-2 mt-6 block font-display text-[13px] font-black uppercase tracking-[0.1em] text-ink"
            >
              {t("pasteLabel")}
            </label>
            <textarea
              id="text"
              data-tour="decode-paste"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t("pastePlaceholder")}
              rows={6}
              className="input leading-relaxed"
            />

            <button
              type="submit"
              className="btn btn-primary btn-lg mt-5 w-full sm:w-auto"
              disabled={loading || (!file && text.trim().length < 10)}
            >
              {loading ? tc("loading") : t("submit")}
            </button>
            <span data-tour="decode-privacy" className="block">
              <PrivacyNote className="mt-5">{t("intro")}</PrivacyNote>
            </span>
          </form>

          {error && (
            <ErrorPanel message={error} />
          )}

          {result?.ok && result.status === "ocr-unavailable" && (
            <div
              className="card sticker mt-5"
              style={{ "--rot": "-0.8deg" } as React.CSSProperties}
            >
              <h2 className="text-h3 text-ink">{t("ocrUnavailableTitle")}</h2>
              <p className="mt-2 text-ink-soft">{t("ocrUnavailableBody")}</p>
            </div>
          )}

          {result?.ok && result.status === "not-covered" && (
            <div className="mt-7">
              <NotCovered title={t("notCoveredTitle")} body={t("notCoveredBody")} services={result.getHelp} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
