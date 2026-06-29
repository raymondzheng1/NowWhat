import type { Metadata } from "next";
import { listGrounds } from "@/lib/legal";
import { LearnContainer } from "@/components/feature/learn/LearnContainer";
import { LearnTrust } from "@/components/feature/learn/LearnTrust";
import { GroundsExplorer } from "@/components/feature/learn/GroundsExplorer";
import { JsonLd } from "@/components/site/JsonLd";
import { definedTermSetLd } from "@/lib/seo/jsonld";

export const metadata: Metadata = {
  title: "The grounds of review explained",
  description:
    "The common grounds of judicial review — procedural fairness, relevant considerations, unreasonableness, jurisdictional error and more — each in plain English with everyday examples. General information, not advice.",
  alternates: { canonical: "/learn/grounds" },
};

export default function GroundsPage() {
  const grounds = listGrounds();
  return (
    <LearnContainer
      breadcrumb={[
        { name: "Home", href: "/" },
        { name: "How review works", href: "/learn" },
        { name: "Grounds of review", href: "/learn/grounds" },
      ]}
    >
      <JsonLd
        data={definedTermSetLd({
          name: "Grounds of review (Australian administrative law)",
          description:
            "The common grounds of judicial review — a specific legal problem with how a government decision was made.",
          path: "/learn/grounds",
          terms: grounds.map((g) => ({
            name: g.plainName,
            description: g.oneLine,
            path: `/learn/grounds/${g.id}`,
          })),
        })}
      />
      <header className="max-w-[720px]">
        <p className="text-[11px] uppercase tracking-[0.22em] text-accent">Grounds of review</p>
        <h1 className="mt-3 font-display text-[34px] font-semibold leading-[1.06] text-ink sm:text-[44px]">
          The grounds people raise
        </h1>
        <p className="mt-4 max-w-[60ch] text-[16px] leading-[1.7] text-ink-soft">
          For judicial review you need a “ground” — a specific problem with how the decision was made,
          not just that you disagree with it. Here are the common ones in plain English. They are listed
          in no particular order; one being relevant doesn’t mean a decision was unlawful — a free service
          can help you weigh it up.
        </p>
      </header>
      <div className="mt-8">
        <GroundsExplorer grounds={grounds} linkBase="/learn/grounds" />
      </div>
      <LearnTrust />
    </LearnContainer>
  );
}
