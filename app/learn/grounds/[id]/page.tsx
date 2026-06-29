import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { listGrounds, getGround } from "@/lib/legal";
import { LearnContainer } from "@/components/feature/learn/LearnContainer";
import { LearnTrust } from "@/components/feature/learn/LearnTrust";
import { GroundExplainer } from "@/components/feature/learn/GroundExplainer";
import { JsonLd } from "@/components/site/JsonLd";
import { articleLd } from "@/lib/seo/jsonld";

export function generateStaticParams() {
  return listGrounds().map((g) => ({ id: g.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const g = getGround(id);
  if (!g) return {};
  return {
    title: `${g.plainName} — a ground of review`,
    description: `${g.oneLine} ${g.name}: what it means, a plain example, and what might relate to your situation. General information, not advice.`,
    alternates: { canonical: `/learn/grounds/${g.id}` },
  };
}

export default async function GroundPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = getGround(id);
  if (!g) notFound();

  return (
    <LearnContainer
      breadcrumb={[
        { name: "Home", href: "/" },
        { name: "How review works", href: "/learn" },
        { name: "Grounds of review", href: "/learn/grounds" },
        { name: g.plainName, href: `/learn/grounds/${g.id}` },
      ]}
    >
      <JsonLd
        data={articleLd({
          headline: `${g.plainName} — a ground of review`,
          description: g.oneLine,
          path: `/learn/grounds/${g.id}`,
          section: "Grounds of review",
        })}
      />
      <GroundExplainer ground={g} level="h1" />
      <div className="mt-8 rounded-card border border-line bg-sand-surface p-5">
        <p className="text-[14.5px] leading-[1.6] text-ink-soft">
          Grounds like this are used in{" "}
          <Link href="/learn/judicial-review" className="link">judicial review</Link>. If you want the
          decision changed rather than checked for legality, see{" "}
          <Link href="/learn/merits-review" className="link">merits review</Link>.
        </p>
      </div>
      <LearnTrust sources={g.sources} />
    </LearnContainer>
  );
}
