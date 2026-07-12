import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/PageHeader";
import { Disclaimer } from "@/components/ui/Disclaimer";

export const metadata: Metadata = {
  title: "About this service",
  description: "A free service that helps people understand and respond to government decisions — grounded in the rules, never guessing.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  const t = useTranslations("about");
  return (
    <div className="container-prose py-12 sm:py-16">
      <PageHeader kicker={t("kicker")} title={t("title")} lead={t("intro")} />

      <h2 className="mt-10 font-display text-[22px] font-bold text-ink">{t("groundedTitle")}</h2>
      <p className="mt-2 leading-relaxed text-ink-soft">{t("groundedBody")}</p>

      <h2 className="mt-8 font-display text-[22px] font-bold text-ink">{t("currencyTitle")}</h2>
      <p className="mt-2 leading-relaxed text-ink-soft">{t("currencyBody")}</p>

      <Disclaimer className="mt-8" />
    </div>
  );
}
