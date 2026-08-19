import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { listConcepts, getConcept } from "@/lib/legal";
import { LearnContainer } from "@/components/feature/learn/LearnContainer";
import { LearnTrust } from "@/components/feature/learn/LearnTrust";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { JsonLd } from "@/components/site/JsonLd";
import { articleLd } from "@/lib/seo/jsonld";

export function generateStaticParams() {
  return listConcepts().map((c) => ({ id: c.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const c = getConcept(id);
  if (!c) return {};
  return {
    title: `${c.plainName} — how review works`,
    description: `${c.oneLine} ${c.name}: what it means in plain English. General information, not advice.`,
    alternates: { canonical: `/learn/how-review-fits-together/${c.id}` },
  };
}

export default async function ConceptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = getConcept(id);
  if (!c) notFound();

  return (
    <LearnContainer
      breadcrumb={[
        { name: "Home", href: "/" },
        { name: "How review works", href: "/learn" },
        { name: "How it fits together", href: "/learn/how-review-fits-together" },
        { name: c.plainName, href: `/learn/how-review-fits-together/${c.id}` },
      ]}
    >
      <JsonLd
        data={articleLd({
          headline: `${c.plainName} — how review works`,
          description: c.oneLine,
          path: `/learn/how-review-fits-together/${c.id}`,
          section: "How review works",
        })}
      />

      <header className="max-w-[720px]">
        <p className="eyebrow text-ink-faint">
          {c.jurisdictions.length > 0
            ? `${c.jurisdictions.includes("Vic") ? "Victoria" : "Australian Government"} only`
            : c.name}
        </p>
        <h1 className="mt-3 font-display text-[32px] font-black leading-[1.05] tracking-[-0.025em] text-ink sm:text-[42px]">
          {c.plainName}
        </h1>
        <p className="mt-4 max-w-[60ch] text-[17px] leading-[1.7] text-ink-soft">{c.oneLine}</p>
      </header>

      <section className="mt-10 max-w-[70ch]">
        <p className="text-[16.5px] leading-[1.75] text-ink">{c.whatItMeans}</p>
      </section>

      {c.whatItIsNot && (
        <section aria-labelledby="c-not" className="card mt-8 max-w-[70ch]">
          <h2 id="c-not" className="font-display text-[19px] font-black text-ink">
            What this does not mean
          </h2>
          <p className="mt-2 text-[15.5px] leading-relaxed text-ink-soft">{c.whatItIsNot}</p>
        </section>
      )}

      {c.keyPoints.length > 0 && (
        <section aria-labelledby="c-points" className="mt-10 max-w-[70ch]">
          <h2 id="c-points" className="font-display text-[22px] font-black text-ink">
            The short version
          </h2>
          <ul className="mt-4 space-y-3">
            {c.keyPoints.map((p, i) => (
              <li key={i} className="flex gap-3 text-[15.5px] leading-relaxed text-ink-soft">
                <span aria-hidden className="mt-[9px] h-[6px] w-[6px] shrink-0 rounded-full bg-accent" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {c.options.length > 0 && (
        <section aria-labelledby="c-options" className="mt-12">
          <h2 id="c-options" className="font-display text-[22px] font-black text-ink">
            The options
          </h2>
          <ul className="mt-5 grid gap-4">
            {c.options.map((o, i) => (
              <li key={i} className="card">
                <h3 className="font-display text-[18px] font-black leading-snug text-ink">
                  {o.plainName}
                </h3>
                <p className="mt-1 text-[13.5px] uppercase tracking-wide text-ink-faint">{o.name}</p>
                <p className="mt-3 text-[15.5px] leading-relaxed text-ink-soft">{o.whatItDoes}</p>
                {o.note && (
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-faint">{o.note}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {c.leadingCases.length > 0 && (
        <section aria-labelledby="c-cases" className="mt-12 max-w-[70ch]">
          <h2 id="c-cases" className="font-display text-[22px] font-black text-ink">
            Where this comes from
          </h2>
          <ul className="mt-4 space-y-4">
            {c.leadingCases.map((k, i) => (
              <li key={i}>
                <p className="font-display text-[16px] font-bold leading-snug text-ink">
                  {k.name}
                  {k.pinpoint ? <span className="font-normal text-ink-faint"> {k.pinpoint}</span> : null}
                </p>
                {k.explains && (
                  <p className="mt-1 text-[15.5px] leading-relaxed text-ink-soft">{k.explains}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {c.sources.length > 0 && (
        <section aria-labelledby="c-sources" className="mt-12 max-w-[70ch]">
          <h2 id="c-sources" className="font-display text-[19px] font-black text-ink">
            Sources
          </h2>
          <ul className="mt-3 space-y-2">
            {c.sources.map((s, i) => (
              <li key={i} className="text-[15px] leading-relaxed text-ink-faint">
                {s}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-12">
        <Disclaimer />
      </div>

      <p className="mt-8">
        <Link
          href="/learn/how-review-fits-together"
          className="link-text inline-flex min-h-[44px] items-center"
        >
          ← All of how it fits together
        </Link>
      </p>

      <LearnTrust />
    </LearnContainer>
  );
}
