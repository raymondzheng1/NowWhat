import type { Metadata } from "next";
import Link from "next/link";
import { listProcesses, listGrounds, getComparison } from "@/lib/legal";
import { LearnContainer } from "@/components/feature/learn/LearnContainer";
import { LearnTrust } from "@/components/feature/learn/LearnTrust";
import { JsonLd } from "@/components/site/JsonLd";
import { itemListLd } from "@/lib/seo/jsonld";

const CRUMB = [
  { name: "Home", href: "/" },
  { name: "How review works", href: "/learn" },
];

export const metadata: Metadata = {
  title: "Merits review and judicial review, explained",
  description:
    "Plain-English explanations of how to challenge an Australian government decision: merits review, judicial review, and the grounds of review. General information, not advice.",
  alternates: { canonical: "/learn" },
};

/** Deterministic tilts — chosen once, never randomised. */
const PROCESS_ROT = ["-1.5deg", "0.9deg"];
const GROUND_PILL_ROT = ["-0.8deg", "0.6deg", "-0.6deg"];

export default function LearnHubPage() {
  // Merits review first — it's the path most people want (a different outcome).
  const processes = [...listProcesses()].sort((a) => (a.id === "merits-review" ? -1 : 1));
  const grounds = listGrounds();
  const comparison = getComparison();

  const learnItems = [
    { name: "Merits review explained", path: "/learn/merits-review" },
    { name: "Judicial review explained", path: "/learn/judicial-review" },
    { name: "The grounds of review", path: "/learn/grounds" },
    { name: "Merits review vs judicial review", path: "/learn/compare" },
  ];

  return (
    <LearnContainer breadcrumb={CRUMB}>
      <JsonLd
        data={itemListLd({
          name: "How review works — understand your options",
          description:
            "Plain-English guides to challenging an Australian government decision: merits review, judicial review, and the grounds of review.",
          items: learnItems,
        })}
      />
      <header className="max-w-[720px]">
        <p className="eyebrow text-ink-faint">Understand your options</p>
        <h1 className="mt-4 font-display text-[40px] font-black leading-[1.02] text-ink sm:text-[52px]">
          How review <span className="marker">works</span>
        </h1>
        <p className="mt-5 max-w-[60ch] text-[19px] leading-[1.6] text-ink-soft">
          If a government decision has gone against you, there are usually two ways to challenge it.
          Here is each one in plain English — what it is, who hears it, and what it can do — plus the
          grounds people raise.
        </p>
        <p className="note mt-4" style={{ transform: "rotate(-1.2deg)" }}>
          Read what you need; you don’t have to take it all in at once.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link
            href="/learn/tour"
            className="btn btn-primary sticker"
            style={{ "--rot": "-0.7deg" } as React.CSSProperties}
          >
            Take the 2-minute tour
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
          <Link href="/start" className="link-text min-h-[44px] self-center">Work out my decision</Link>
        </div>
      </header>

      {/* The two processes */}
      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        {processes.map((p, i) => (
          <Link
            key={p.id}
            href={`/learn/${p.id}`}
            className="card sticker flex flex-col gap-3 text-ink-soft"
            style={{ "--rot": PROCESS_ROT[i % PROCESS_ROT.length] } as React.CSSProperties}
          >
            <span className="pill self-start bg-cream text-ink-soft">{p.plainName}</span>
            <h2 className="font-display text-[26px] font-black leading-[1.15] text-ink">{p.name}</h2>
            <p className="flex-1 text-[16px] leading-[1.6] text-ink-soft">{p.oneLine}</p>
            <span className="link-text">
              Read more
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </span>
          </Link>
        ))}
      </div>

      {/* Compare */}
      <Link
        href="/learn/compare"
        className="card sticker mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
        style={{ "--rot": "0.6deg" } as React.CSSProperties}
      >
        <div>
          <h2 className="font-display text-[22px] font-black text-ink">Not sure which one?</h2>
          <p className="mt-1 text-[16px] leading-[1.6] text-ink-soft">{comparison.chooser.question} — see them side by side and a quick guide.</p>
        </div>
        <span className="link-text whitespace-nowrap">
          Compare them
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      </Link>

      {/* Grounds teaser */}
      <section className="mt-14">
        <h2 className="font-display text-[28px] font-black text-ink">The grounds of review</h2>
        <p className="mt-2 max-w-[60ch] text-[16px] leading-[1.6] text-ink-soft">
          For judicial review you need a “ground” — a specific legal problem with how the decision was
          made. There are {grounds.length} common ones. Each is explained in plain English, with everyday
          examples and what might relate to your situation.
        </p>
        <div className="mt-6 flex flex-wrap gap-2.5">
          {grounds.map((g, i) => (
            <Link
              key={g.id}
              href={`/learn/grounds/${g.id}`}
              className="sticker inline-flex min-h-[44px] items-center rounded-pill border-2 border-line bg-paper px-4 py-2 text-[14.5px] text-ink"
              style={{ "--rot": GROUND_PILL_ROT[i % GROUND_PILL_ROT.length] } as React.CSSProperties}
            >
              {g.plainName}
            </Link>
          ))}
        </div>
        <Link href="/learn/grounds" className="link-text mt-4 inline-flex min-h-[44px]">
          Explore all grounds
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      </section>

      <LearnTrust />
    </LearnContainer>
  );
}
