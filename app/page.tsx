import Link from "next/link";
import { useTranslations } from "next-intl";
import { getPublishedFaqs } from "@/lib/faq/load";

/**
 * Landing page — trust-first authority model (PRD §9, harness §14.1):
 * hero → two actions → trust → how-it-works → grounded example → FAQ teaser → get help.
 */
export default function HomePage() {
  const t = useTranslations("home");
  const nav = useTranslations("nav");
  const faqs = getPublishedFaqs().slice(0, 3);

  return (
    <div>
      {/* Hero */}
      <section className="bg-brand-soft">
        <div className="container-prose py-14 text-center">
          <h1 className="font-display text-3xl font-bold text-brand-ink sm:text-4xl">
            {t("heroTitle")}
          </h1>
          <p className="mx-auto mt-4 max-w-prose text-lg text-ink-soft">{t("heroSubtitle")}</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/start" className="btn-primary">{t("ctaStart")}</Link>
            <Link href="/ask" className="btn-secondary">{t("ctaAsk")}</Link>
          </div>
        </div>
      </section>

      {/* Trust cards */}
      <section className="container-wide grid gap-4 py-12 sm:grid-cols-3">
        {[1, 2, 3].map((n) => (
          <div key={n} className="card">
            <h2 className="font-display text-lg font-bold text-ink">{t(`trust${n}Title`)}</h2>
            <p className="mt-2 text-sm text-ink-soft">{t(`trust${n}Body`)}</p>
          </div>
        ))}
      </section>

      {/* How it works */}
      <section className="bg-paper">
        <div className="container-wide py-12">
          <h2 className="font-display text-2xl font-bold text-ink">{t("howTitle")}</h2>
          <ol className="mt-6 grid gap-6 sm:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <li key={n} className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
                  {n}
                </span>
                <p className="text-ink-soft">{t(`howStep${n}`)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Grounded example */}
      <section className="container-prose py-12">
        <div className="card">
          <h2 className="font-display text-xl font-bold text-ink">{t("exampleTitle")}</h2>
          <p className="mt-3 text-ink-soft">{t("exampleBody")}</p>
        </div>
      </section>

      {/* FAQ teaser */}
      <section className="container-wide py-12">
        <h2 className="font-display text-2xl font-bold text-ink">{t("faqTeaserTitle")}</h2>
        <p className="mt-2 text-ink-soft">{t("faqTeaserBody")}</p>
        {faqs.length > 0 ? (
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {faqs.map((f) => (
              <li key={f.slug}>
                <Link href={`/faq/${f.slug}`} className="card block hover:border-brand">
                  <span className="font-semibold text-brand-ink">{f.question}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="mt-4">
          <Link href="/faq" className="link">{nav("faq")} →</Link>
        </p>
      </section>

      {/* Closing CTA */}
      <section className="bg-help-soft">
        <div className="container-prose py-12 text-center">
          <h2 className="font-display text-2xl font-bold text-help-ink">{t("closingTitle")}</h2>
          <p className="mx-auto mt-3 max-w-prose text-ink-soft">{t("closingBody")}</p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/start" className="btn-primary">{t("ctaStart")}</Link>
            <Link href="/help" className="btn-secondary">{nav("help")}</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
