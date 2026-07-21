import type { Metadata } from "next";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { getPublishedFaqs } from "@/lib/faq/load";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = {
  title: "Common questions",
  description: "Plain-language answers about government decisions — grounded in the rules and checked by a person before publishing.",
  alternates: { canonical: "/faq" },
};

/**
 * FAQ index (K2 editorial) — the answer library. Categories as sections, each question a
 * ruled row (hairline dividers, not floating cards), matching the homepage index language.
 * This page is a primary SEO surface; keep headings descriptive and links keyword-rich.
 */
export default function FaqIndexPage() {
  const t = useTranslations("faq");
  const faqs = getPublishedFaqs();
  const categories = [...new Set(faqs.map((f) => f.category ?? "General"))];

  return (
    <div className="container-wide py-12 sm:py-16">
      <PageHeader kicker={t("kicker")} title={t("title")} lead={t("intro")} />

      <div className="mt-10 grid gap-x-14 gap-y-10 lg:grid-cols-2">
        {categories.map((cat) => (
          <section key={cat} aria-label={cat}>
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.2em] text-accent">{cat}</h2>
            <ul className="mt-3 border-t border-line-strong">
              {faqs
                .filter((f) => (f.category ?? "General") === cat)
                .map((f) => (
                  <li key={f.slug} className="border-b border-line">
                    <Link href={`/faq/${f.slug}`} className="group block py-4">
                      <span className="font-display text-[19px] font-bold leading-snug text-ink group-hover:text-accent">
                        {f.question}
                      </span>
                      <p className="mt-1 text-[14.5px] leading-[1.55] text-ink-soft">{f.description}</p>
                    </Link>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>

      {/* Onward CTA — bordered panel in the K2 language */}
      <div className="mt-14 flex flex-col gap-5 border border-line-strong bg-paper p-7 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <h2 className="font-display text-[22px] font-bold text-ink">{t("ctaTitle")}</h2>
          <p className="mt-1 text-[15.5px] text-ink-soft">{t("ctaBody")}</p>
        </div>
        <Link href="/start" className="btn-primary whitespace-nowrap px-6 sm:flex-none">
          {t("ctaButton")}
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
