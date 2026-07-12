"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

/**
 * Global error boundary (K2) — calm and honest. Reassures that nothing the person
 * entered was stored (true: letters/answers are processed in memory only), offers a
 * retry and a way home. Never exposes the technical error to the person.
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
      <p className="text-[11px] uppercase tracking-[0.28em] text-accent">{t("kicker")}</p>
      <h1 className="mt-4 max-w-[640px] font-display text-[36px] font-semibold leading-[1.06] text-ink sm:text-[48px]">
        {t("title")}
      </h1>
      <p className="mt-5 max-w-[52ch] text-[15.5px] leading-[1.68] text-ink-soft">{t("lead")}</p>
      <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4">
        <button type="button" onClick={reset} className="btn-primary px-6">
          {t("retry")}
        </button>
        <Link href="/" className="link-text">
          {t("home")}
        </Link>
      </div>
    </div>
  );
}
