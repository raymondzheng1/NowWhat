"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

/**
 * Global error boundary (sticker album) — calm and honest, on a single white sticker.
 * Reassures that nothing the person entered was stored (true: letters/answers are
 * processed in memory only), offers a retry and a way home. Never exposes the technical
 * error to the person. No empty slot here: nothing is missing, something went wrong.
 */
export default function GlobalError({
  reset,
}: {
  error?: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errorPage");
  return (
    <div className="container-wide py-16 sm:py-24">
      <div
        className="card sticker max-w-[720px]"
        style={{ "--rot": "-0.9deg" } as React.CSSProperties}
      >
        <p className="eyebrow text-ink-faint">{t("kicker")}</p>
        <h1 className="mt-2.5 text-[32px] leading-[1.05] sm:text-[42px]">{t("title")}</h1>
        <p className="mt-4 max-w-[52ch] text-body text-ink-soft">{t("lead")}</p>
        <div className="mt-7 flex flex-wrap items-center gap-x-7 gap-y-4">
          <button type="button" onClick={reset} className="btn btn-primary">
            {t("retry")}
          </button>
          <Link href="/" className="link-text">
            {t("home")}
          </Link>
        </div>
      </div>
    </div>
  );
}
