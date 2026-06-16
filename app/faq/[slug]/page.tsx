import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getPublishedFaqs, getFaq } from "@/lib/faq/load";
import { getEntry } from "@/lib/corpus/index";
import { Markdown } from "@/components/ui/Markdown";
import { SourcesPanel } from "@/components/ui/SourcesPanel";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { GetHelp } from "@/components/ui/GetHelp";
import { JsonLd } from "@/components/site/JsonLd";
import { siteUrl, DISCLAIMER } from "@/lib/config";

export function generateStaticParams() {
  return getPublishedFaqs().map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const faq = getFaq(slug);
  if (!faq) return {};
  return {
    title: faq.title,
    description: faq.description,
    alternates: { canonical: `/faq/${slug}` },
    openGraph: { title: faq.title, description: faq.description, type: "article" },
  };
}

export default async function FaqPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const faq = getFaq(slug);
  if (!faq) notFound();

  const t = await getTranslations("faq");
  const entry = getEntry(faq.entryId);
  const help = entry?.getHelp ?? [];
  const base = siteUrl();

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          // Answer + the required disclaimer, so the rich result is never bare advice.
          text: `${faq.answer} ${DISCLAIMER}`,
        },
      },
    ],
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Common questions", item: `${base}/faq` },
      { "@type": "ListItem", position: 2, name: faq.title, item: `${base}/faq/${slug}` },
    ],
  };

  return (
    <article className="container-prose py-10">
      <JsonLd data={faqLd} />
      <JsonLd data={breadcrumbLd} />

      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-ink-faint">
        <Link href="/faq" className="link">{t("title")}</Link> <span aria-hidden>/</span>
      </nav>

      <h1 className="font-display text-3xl font-bold text-ink">{faq.question}</h1>
      <p className="mt-4 text-lg text-ink-soft">{faq.answer}</p>

      <div className="mt-6">
        <Markdown>{faq.body}</Markdown>
      </div>

      <Disclaimer className="mt-8" />

      <div className="mt-6">
        <SourcesPanel sources={faq.sources} lastVerified={faq.updated} />
      </div>

      {/* Conversion CTA into the tool (tracked) — harness §14.2 */}
      <div className="card mt-6 bg-brand-soft">
        <h2 className="font-display text-lg font-bold text-brand-ink">{t("ctaTitle")}</h2>
        <p className="mt-1 text-ink-soft">{t("ctaBody")}</p>
        <Link href={`/decode?source=faq&topic=${slug}`} className="btn-primary mt-3">
          {t("ctaButton")}
        </Link>
      </div>

      {help.length > 0 && (
        <div className="mt-6">
          <GetHelp services={help} />
        </div>
      )}

      {faq.related.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-lg font-bold text-ink">{t("relatedTitle")}</h2>
          <ul className="mt-2 space-y-1">
            {faq.related.map((r) => (
              <li key={r}>
                <Link href={`/faq/${r}`} className="link">{r}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
