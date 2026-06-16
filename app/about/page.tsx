import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { Disclaimer } from "@/components/ui/Disclaimer";

export const metadata: Metadata = {
  title: "About this service",
  description: "A free service that helps people understand and respond to government decisions — grounded in the rules, never guessing.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  const t = useTranslations("about");
  return (
    <div className="container-prose py-10">
      <h1 className="font-display text-3xl font-bold text-ink">{t("title")}</h1>
      <p className="mt-3 text-ink-soft">{t("intro")}</p>

      <h2 className="mt-6 font-display text-xl font-bold text-ink">{t("groundedTitle")}</h2>
      <p className="mt-2 text-ink-soft">{t("groundedBody")}</p>

      <h2 className="mt-6 font-display text-xl font-bold text-ink">{t("currencyTitle")}</h2>
      <p className="mt-2 text-ink-soft">{t("currencyBody")}</p>

      <Disclaimer className="mt-8" />
    </div>
  );
}
