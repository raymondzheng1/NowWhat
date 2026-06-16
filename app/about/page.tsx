import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { Eyebrow } from "@/components/ui/Eyebrow";
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
      <Eyebrow>About</Eyebrow>
      <h1 className="mt-3 font-serif text-h1 font-bold text-navy-ink">{t("title")}</h1>
      <p className="mt-3 text-lead text-ink-soft">{t("intro")}</p>

      <h2 className="mt-8 font-serif text-h3 font-bold text-ink">{t("groundedTitle")}</h2>
      <p className="mt-2 leading-relaxed text-ink-soft">{t("groundedBody")}</p>

      <h2 className="mt-8 font-serif text-h3 font-bold text-ink">{t("currencyTitle")}</h2>
      <p className="mt-2 leading-relaxed text-ink-soft">{t("currencyBody")}</p>

      <Disclaimer className="mt-8" />
    </div>
  );
}
