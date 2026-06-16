import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { AskClient } from "@/components/feature/AskClient";

export const metadata: Metadata = {
  title: "Ask a question",
  description:
    "Ask about a government decision in plain English. Grounded, plain-language answers that show where they come from.",
  alternates: { canonical: "/ask" },
};

export default function AskPage() {
  const t = useTranslations("ask");
  return (
    <div className="container-prose py-10">
      <h1 className="font-display text-3xl font-bold text-ink">{t("title")}</h1>
      <p className="mt-2 mb-6 text-ink-soft">{t("intro")}</p>
      <AskClient />
    </div>
  );
}
