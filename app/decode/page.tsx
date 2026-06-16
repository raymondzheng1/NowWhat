import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { DecodeClient } from "@/components/feature/DecodeClient";

export const metadata: Metadata = {
  title: "Scan or paste a letter",
  description:
    "Scan, upload, or paste a government decision letter and get a plain-English explanation, the review pathway, and the time limit. We never keep your letter.",
  alternates: { canonical: "/decode" },
};

export default function DecodePage() {
  const t = useTranslations("decode");
  return (
    <div className="container-prose py-10">
      <h1 className="font-display text-3xl font-bold text-ink">{t("title")}</h1>
      <p className="mt-2 mb-6 text-ink-soft">{t("intro")}</p>
      <DecodeClient />
    </div>
  );
}
