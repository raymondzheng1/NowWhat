import type { Metadata } from "next";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { getPublishedFaqs } from "@/lib/faq/load";

export const metadata: Metadata = {
  title: "Common questions",
  description: "Plain-language answers about government decisions — grounded in the rules and checked by a person before publishing.",
  alternates: { canonical: "/faq" },
};

export default function FaqIndexPage() {
  const t = useTranslations("faq");
  const faqs = getPublishedFaqs();
  const categories = [...new Set(faqs.map((f) => f.category ?? "General"))];

  return (
    <div className="container-prose py-10">
      <h1 className="font-display text-3xl font-bold text-ink">{t("title")}</h1>
      <p className="mt-2 mb-6 text-ink-soft">{t("intro")}</p>

      {categories.map((cat) => (
        <section key={cat} className="mb-8">
          <h2 className="mb-3 font-display text-xl font-bold text-ink">{cat}</h2>
          <ul className="space-y-3">
            {faqs
              .filter((f) => (f.category ?? "General") === cat)
              .map((f) => (
                <li key={f.slug}>
                  <Link href={`/faq/${f.slug}`} className="card block hover:border-brand">
                    <span className="font-semibold text-brand-ink">{f.question}</span>
                    <p className="mt-1 text-sm text-ink-soft">{f.description}</p>
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      ))}

      <div className="card bg-brand-soft">
        <h2 className="font-display text-lg font-bold text-brand-ink">{t("ctaTitle")}</h2>
        <p className="mt-1 text-ink-soft">{t("ctaBody")}</p>
        <Link href="/decode" className="btn-primary mt-3">{t("ctaButton")}</Link>
      </div>
    </div>
  );
}
