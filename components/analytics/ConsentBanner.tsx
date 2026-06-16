"use client";

import { useTranslations } from "next-intl";
import { useConsent, setConsent } from "@/components/analytics/consent";

export function ConsentBanner() {
  const t = useTranslations("consent");
  const consent = useConsent();
  if (consent !== "unset") return null;
  if (!process.env.NEXT_PUBLIC_GA_ID) return null; // nothing to consent to

  return (
    <div
      role="dialog"
      aria-label="Analytics choice"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper p-4 shadow-card"
    >
      <div className="container-wide flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-soft">{t("message")}</p>
        <div className="flex shrink-0 gap-2">
          <button className="btn-secondary py-2" onClick={() => setConsent(false)}>
            {t("decline")}
          </button>
          <button className="btn-primary py-2" onClick={() => setConsent(true)}>
            {t("accept")}
          </button>
        </div>
      </div>
    </div>
  );
}
