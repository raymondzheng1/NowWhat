import type { Metadata } from "next";
import { getComparison } from "@/lib/legal";
import { LearnContainer } from "@/components/feature/learn/LearnContainer";
import { LearnTrust } from "@/components/feature/learn/LearnTrust";
import { MrVsJr } from "@/components/feature/learn/MrVsJr";
import { JsonLd } from "@/components/site/JsonLd";
import { articleLd, faqPageLd } from "@/lib/seo/jsonld";

export const metadata: Metadata = {
  title: "Merits review vs judicial review",
  description:
    "The difference between merits review and judicial review, side by side, with a calm guide to which one fits what you are hoping for. General information, not advice.",
  alternates: { canonical: "/learn/compare" },
};

export default function ComparePage() {
  const comparison = getComparison();
  return (
    <LearnContainer
      breadcrumb={[
        { name: "Home", href: "/" },
        { name: "How review works", href: "/learn" },
        { name: "Merits vs judicial review", href: "/learn/compare" },
      ]}
    >
      <JsonLd
        data={articleLd({
          headline: "Merits review vs judicial review",
          description: "The difference between merits review and judicial review, side by side.",
          path: "/learn/compare",
          section: "How review works",
        })}
      />
      {comparison.faq.length > 0 && (
        <JsonLd data={faqPageLd(comparison.faq.map((f) => ({ question: f.q, answer: f.a })))} />
      )}

      <header className="max-w-[720px]">
        <p className="text-[11px] uppercase tracking-[0.22em] text-accent">Two paths</p>
        <h1 className="mt-3 font-display text-[34px] font-semibold leading-[1.06] text-ink sm:text-[44px]">
          Merits review vs judicial review
        </h1>
      </header>
      <div className="mt-8">
        <MrVsJr comparison={comparison} />
      </div>

      {comparison.faq.length > 0 && (
        <section aria-labelledby="compare-faq" className="mt-12">
          <h2 id="compare-faq" className="font-display text-[26px] font-semibold text-ink">Common questions</h2>
          <dl className="mt-5 divide-y divide-line border-y border-line">
            {comparison.faq.map((f) => (
              <div key={f.q} className="py-4">
                <dt className="font-display text-[18px] font-semibold text-ink">{f.q}</dt>
                <dd className="mt-1.5 text-[15px] leading-[1.6] text-ink-soft">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <LearnTrust />
    </LearnContainer>
  );
}
