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

/**
 * FAQ article (sticker album) — mono breadcrumb, the question as the headline, the short
 * answer on a white sticker card, then the prose, the standing disclaimer, the sources
 * panel, and the ONE foil element allowed on this screen: the "work out what you can do"
 * CTA. Everything else stays square so the reading column is calm.
 */
export default async function FaqPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const faq = getFaq(slug);
  if (!faq) notFound();

  const t = await getTranslations("faq");
  const entry = getEntry(faq.entryId);
  // Resolve related slugs to published articles so we can show their questions, and so a
  // stale slug silently disappears instead of rendering a dead link.
  const relatedFaqs = faq.related
    .map((slug) => getPublishedFaqs().find((f) => f.slug === slug))
    .filter((f): f is NonNullable<typeof f> => Boolean(f));

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
    <article className="container-prose py-10 sm:py-14">
      <JsonLd data={faqLd} />
      <JsonLd data={breadcrumbLd} />

      <nav aria-label="Breadcrumb" className="mono mb-5 uppercase text-ink-faint">
        <Link href="/faq" className="underline underline-offset-[3px] hover:text-ink">{t("title")}</Link> <span aria-hidden>/</span>
      </nav>

      <h1 className="text-h1">{faq.question}</h1>

      {/* The short answer — the one thing to read, on a sticker. */}
      <div
        className="card sticker mt-6"
        style={{ "--rot": "-0.9deg" } as React.CSSProperties}
      >
        <p className="eyebrow text-ink-faint">{t("answer")}</p>
        <p className="mt-2.5 text-lede text-ink-soft">{faq.answer}</p>
      </div>

      <div className="mt-8">
        <Markdown>{faq.body}</Markdown>
      </div>

      <Disclaimer className="mt-8" />

      <div className="mt-6">
        <SourcesPanel sources={faq.sources} lastVerified={faq.updated} />
      </div>

      {/* Conversion CTA into the tool (tracked) — harness §14.2. The single foil element
          on this screen: the one recommended action. */}
      <div className="foil sticker mt-8" style={{ "--rot": "1.1deg" } as React.CSSProperties}>
        <div className="foil-inner">
          <h2 className="text-h2">{t("ctaTitle")}</h2>
          <p className="mt-1.5 text-sm text-ink-soft">{t("ctaBody")}</p>
          <Link href={`/decode?source=faq&topic=${slug}`} className="btn btn-primary mt-5 w-full sm:w-auto">
            {t("ctaButton")} <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>

      {help.length > 0 && (
        <div className="mt-6">
          <GetHelp services={help} />
        </div>
      )}

      {/* Take the person back into their own matter. The article already names the pathway
          it was written for, so this deep-links straight to that decision type in the flow
          instead of dropping them at a cold start screen. */}
      <section
        className="card sticker mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        style={{ "--rot": "-0.7deg" } as React.CSSProperties}
      >
        <div className="min-w-0">
          <h2 className="font-display text-[21px] font-black text-ink">{t("ctaFlowTitle")}</h2>
          <p className="mt-1.5 text-[15.5px] leading-snug text-ink-soft">{t("ctaFlowBody")}</p>
        </div>
        <Link
          href={`/start?area=${encodeURIComponent(faq.entryId)}`}
          className="btn btn-primary whitespace-nowrap sm:flex-none"
        >
          {t("ctaFlowButton")} <span aria-hidden="true">→</span>
        </Link>
      </section>

      {relatedFaqs.length > 0 && (
        <section className="mt-10">
          <h2 className="eyebrow text-ink-faint">{t("relatedTitle")}</h2>
          <ul className="mt-3 border-t-2 border-ink">
            {relatedFaqs.map((r) => (
              <li key={r.slug} className="border-b border-line">
                <Link
                  href={`/faq/${r.slug}`}
                  className="group flex min-h-[44px] items-center justify-between gap-4 py-3.5 text-[16px] font-medium text-ink hover:text-red-ink"
                >
                  {/* The question, not the slug — the raw slug was unreadable. */}
                  <span className="min-w-0">{r.question}</span>
                  <span aria-hidden="true" className="shrink-0 text-ink-faint group-hover:text-red-ink">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
