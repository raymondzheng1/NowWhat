import type { Metadata } from "next";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { getPublishedFaqs } from "@/lib/faq/load";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = {
  title: "Common questions about government decisions",
  description:
    "Plain-English answers on reviewing Commonwealth and Victorian government decisions — Centrelink, fines, renting and housing — each grounded in sourced rules and checked by a person.",
  alternates: { canonical: "/faq" },
};

/**
 * FAQ index (sticker album) — the answer library. Categories are sections with a tracked
 * label over a 2px ink rule; each question is a ruled row, deliberately UNROTATED so a
 * dense list stays scannable. The only sticker on the page is the closing CTA card.
 * This page is a primary SEO surface; keep headings descriptive and links keyword-rich.
 */
export default function FaqIndexPage() {
  const t = useTranslations("faq");
  const faqs = getPublishedFaqs();
  const categories = [...new Set(faqs.map((f) => f.category ?? "General"))];

  return (
    <div className="container-wide py-12 sm:py-16">
      <PageHeader kicker={t("kicker")} title={t("title")} lead={t("intro")} />

      <p className="note mt-5 -rotate-0.8">{t("indexNote")}</p>

      <div className="mt-10 grid gap-x-14 gap-y-12 lg:grid-cols-2">
        {categories.map((cat) => (
          <section key={cat} aria-label={cat}>
            <h2 className="eyebrow text-ink-faint">{cat}</h2>
            <ul className="mt-3 border-t-2 border-ink">
              {faqs
                .filter((f) => (f.category ?? "General") === cat)
                .map((f) => (
                  <li key={f.slug} className="border-b border-line">
                    <Link href={`/faq/${f.slug}`} className="group block py-4">
                      <span className="font-display text-[19px] font-black leading-snug text-ink group-hover:text-red-ink">
                        {f.question}
                      </span>
                      <p className="mt-1 text-sm text-ink-soft">{f.description}</p>
                    </Link>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>

      {/* Onward CTA — a white sticker card laid on the paper (no foil: the article pages
          carry the one recommended action). */}
      <div
        className="card sticker mt-14 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"
        style={{ "--rot": "-0.7deg" } as React.CSSProperties}
      >
        <div>
          <h2 className="text-h2">{t("ctaTitle")}</h2>
          <p className="mt-1.5 text-sm text-ink-soft">{t("ctaBody")}</p>
        </div>
        <Link href="/start" className="btn btn-primary whitespace-nowrap sm:flex-none">
          {t("ctaButton")}
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
