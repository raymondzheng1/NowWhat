"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { postDecodeText, postDecodeFile, type DecodeResponse } from "@/components/feature/api";
import { EntryActions } from "@/components/feature/EntryActions";
import { NotCovered } from "@/components/feature/NotCovered";
import { ByoKeyField } from "@/components/feature/ByoKeyField";
import { Disclaimer } from "@/components/ui/Disclaimer";

export function DecodeClient() {
  const t = useTranslations("decode");
  const tc = useTranslations("common");
  const te = useTranslations("errors");

  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [byoKey, setByoKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DecodeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  function msg(m: string): string {
    return m.startsWith("errors.") ? te(m.slice(7)) : m;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file && text.trim().length < 10) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = text.trim().length >= 10
        ? await postDecodeText(text.trim(), byoKey || undefined)
        : await postDecodeFile(file as File, byoKey || undefined);
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
        <label htmlFor="file" className="mb-1 block font-medium text-ink">
          {t("uploadLabel")}
        </label>
        <input
          id="file"
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm"
        />

        <label htmlFor="text" className="mb-1 mt-4 block font-medium text-ink">
          {t("pasteLabel")}
        </label>
        <textarea
          id="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("pastePlaceholder")}
          rows={6}
          className="w-full rounded-card border border-line px-3 py-2"
        />

        <ByoKeyField value={byoKey} onChange={setByoKey} />
        <button type="submit" className="btn-primary mt-3" disabled={loading || (!file && text.trim().length < 10)}>
          {loading ? tc("loading") : t("submit")}
        </button>
        <p className="mt-3 text-xs text-ink-faint">{t("intro")}</p>
      </form>

      {error && (
        <div role="alert" className="card border-danger/30 bg-clock-soft text-clock-ink">{error}</div>
      )}

      {result?.ok && result.status === "ocr-unavailable" && (
        <div className="card">
          <h2 className="font-display text-lg font-bold text-ink">{t("ocrUnavailableTitle")}</h2>
          <p className="mt-2 text-ink-soft">{t("ocrUnavailableBody")}</p>
        </div>
      )}

      {result?.ok && result.status === "answered" && (
        <div className="space-y-6">
          <div className="card">
            <h2 className="font-display text-xl font-bold text-ink">{t("whatItIs")}</h2>
            <p className="mt-1 text-ink-soft">{result.decode.whatItIs}</p>
            <h3 className="mt-4 font-display text-lg font-semibold text-ink">{t("whatItMeans")}</h3>
            <p className="mt-1 whitespace-pre-line text-ink-soft">{result.decode.whatItMeans}</p>
            {result.decode.options.length > 0 && (
              <>
                <h3 className="mt-4 font-display text-lg font-semibold text-ink">{t("options")}</h3>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-ink-soft">
                  {result.decode.options.map((o, i) => <li key={i}>{o}</li>)}
                </ul>
              </>
            )}
            {result.isFallback && (
              <p className="mt-3 rounded-card bg-paper-sunk p-3 text-sm text-ink-soft">{t("fallbackNote")}</p>
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
