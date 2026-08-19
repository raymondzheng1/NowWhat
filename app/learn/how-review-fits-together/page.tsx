import type { Metadata } from "next";
import Link from "next/link";
import { listConcepts } from "@/lib/legal";
import { LearnContainer } from "@/components/feature/learn/LearnContainer";
import { LearnTrust } from "@/components/feature/learn/LearnTrust";
import { JsonLd } from "@/components/site/JsonLd";
import { definedTermSetLd } from "@/lib/seo/jsonld";

export const metadata: Metadata = {
  title: "How the review system fits together",
  description:
    "The parts of a government-decision challenge beyond the grounds — which court, what a court can actually give you, whether you are the right person to bring it, and the free complaint routes. Plain English, general information, not advice.",
  alternates: { canonical: "/learn/how-review-fits-together" },
};

/**
 * The structural layer of the owner's decision-tree: justiciability, the two federal routes,
 * remedies, standing, and the two non-review avenues. Grounds answer "what went wrong"; these
 * answer everything around it — which door, who may knock, and what is behind it.
 */
export default function ConceptsPage() {
  const concepts = listConcepts();
  return (
    <LearnContainer
      breadcrumb={[
        { name: "Home", href: "/" },
        { name: "How review works", href: "/learn" },
        { name: "How it fits together", href: "/learn/how-review-fits-together" },
      ]}
    >
      <JsonLd
        data={definedTermSetLd({
          name: "How administrative review fits together (Australia)",
          description:
            "The structural parts of a challenge to a government decision: which court, what it can give you, standing, and the free complaint routes.",
          path: "/learn/how-review-fits-together",
          terms: concepts.map((c) => ({
            name: c.plainName,
            description: c.oneLine,
            path: `/learn/how-review-fits-together/${c.id}`,
          })),
        })}
      />
      <header className="max-w-[720px]">
        <p className="eyebrow text-ink-faint">The bigger picture</p>
        <h1 className="mt-3 font-display text-[34px] font-black leading-[1.03] tracking-[-0.025em] text-ink sm:text-[44px]">
          How it all fits together
        </h1>
        <p className="mt-4 max-w-[60ch] text-[16.5px] leading-[1.7] text-ink-soft">
          The grounds cover what went wrong with a decision. These cover everything around it —
          which body can help, whether you are the right person to ask, and what you can actually
          walk away with. You do not need to work any of this out yourself. It is here so the
          questions make sense when someone asks you one.
        </p>
      </header>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {concepts.map((c) => (
          <li key={c.id}>
            <Link
              href={`/learn/how-review-fits-together/${c.id}`}
              className="card flex min-h-[44px] flex-col gap-2 no-underline transition hover:shadow-lift focus-visible:outline-2"
            >
              <span className="font-display text-[19px] font-black leading-tight text-ink">
                {c.plainName}
              </span>
              <span className="text-[15.5px] leading-relaxed text-ink-soft">{c.oneLine}</span>
              {c.jurisdictions.length > 0 && (
                <span className="eyebrow text-ink-faint">
                  {c.jurisdictions.includes("Vic") ? "Victoria" : "Australian Government"} only
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>

      <LearnTrust />
    </LearnContainer>
  );
}
