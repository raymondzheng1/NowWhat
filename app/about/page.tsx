import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/PageHeader";
import { Disclaimer } from "@/components/ui/Disclaimer";

export const metadata: Metadata = {
  title: "About this free public-law service",
  description:
    "A free service explaining how to challenge an Australian Government or Victorian decision — merits review, judicial review and the grounds of judicial review, grounded in sourced rules.",
  alternates: { canonical: "/about" },
};

/**
 * About (sticker album) — a quiet editorial page: header, then prose in a measured
 * column separated by hairlines. No stickers, no rotation; this page is paper.
 */
export default function AboutPage() {
  const t = useTranslations("about");
  return (
    <div className="container-prose py-12 sm:py-16">
      <PageHeader kicker={t("kicker")} title={t("title")} lead={t("intro")} />

      <div className="mt-10 border-t-2 border-ink pt-8">
        <section>
          <h2 className="text-h2">{t("groundedTitle")}</h2>
          <p className="mt-3 text-body leading-relaxed text-ink-soft">{t("groundedBody")}</p>
        </section>

        <section className="mt-9 border-t border-line pt-8">
          <h2 className="text-h2">{t("currencyTitle")}</h2>
          <p className="mt-3 text-body leading-relaxed text-ink-soft">{t("currencyBody")}</p>
        </section>
      </div>

      <Disclaimer className="mt-10" />
    </div>
  );
}
