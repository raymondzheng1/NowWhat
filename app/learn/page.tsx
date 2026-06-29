import type { Metadata } from "next";
import Link from "next/link";
import { listProcesses, listGrounds, getComparison } from "@/lib/legal";
import { LearnContainer } from "@/components/feature/learn/LearnContainer";
import { LearnTrust } from "@/components/feature/learn/LearnTrust";

export const metadata: Metadata = {
  title: "How review works — your options explained",
  description:
    "Plain-English explanations of how to challenge a government decision in Victoria or the Commonwealth: merits review, judicial review, and the grounds of review. General information, not advice.",
  alternates: { canonical: "/learn" },
};

export default function LearnHubPage() {
  // Merits review first — it's the path most people want (a different outcome).
  const processes = [...listProcesses()].sort((a) => (a.id === "merits-review" ? -1 : 1));
  const grounds = listGrounds();
  const comparison = getComparison();

  return (
    <LearnContainer>
      <header className="max-w-[720px]">
        <p className="text-[11px] uppercase tracking-[0.28em] text-accent">Understand your options</p>
        <h1 className="mt-4 font-display text-[40px] font-semibold leading-[1.06] text-ink sm:text-[52px]">
          How review works
        </h1>
        <p className="mt-5 max-w-[60ch] font-display text-[19px] leading-[1.6] text-ink-soft">
          If a government decision has gone against you, there are usually two ways to challenge it.
          Here is each one in plain English — what it is, who hears it, and what it can do — plus the
          grounds people raise. Read what you need; you don’t have to take it all in at once.
        </p>
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3">
          <Link href="/learn/tour" className="btn-primary">
            Take the 2-minute tour
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
          <Link href="/start" className="link-text self-center">Work out my decision</Link>
        </div>
      </header>

      {/* The two processes */}
      <div className="mt-12 grid gap-5 sm:grid-cols-2">
        {processes.map((p) => (
          <Link
            key={p.id}
            href={`/learn/${p.id}`}
            className="group rounded-card border border-line bg-paper p-6 transition-colors hover:border-rail-accent"
          >
            <p className="text-[11px] uppercase tracking-[0.18em] text-accent">{p.plainName}</p>
            <h2 className="mt-2 font-display text-[26px] font-semibold text-ink">{p.name}</h2>
            <p className="mt-2 text-[15px] leading-[1.6] text-ink-soft">{p.oneLine}</p>
            <span className="link-text mt-4 inline-block group-hover:text-ink">Read more</span>
          </Link>
        ))}
      </div>

      {/* Compare */}
      <Link
        href="/learn/compare"
        className="mt-5 flex flex-col gap-2 rounded-card border border-line bg-sand-surface p-6 transition-colors hover:border-rail-accent sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h2 className="font-display text-[22px] font-semibold text-ink">Not sure which one?</h2>
          <p className="mt-1 text-[15px] text-ink-soft">{comparison.chooser.question} — see them side by side and a quick guide.</p>
        </div>
        <span className="link-text whitespace-nowrap">Compare them</span>
      </Link>

      {/* Grounds teaser */}
      <section className="mt-12">
        <h2 className="font-display text-[28px] font-semibold text-ink">The grounds of review</h2>
        <p className="mt-2 max-w-[60ch] text-[15px] leading-[1.6] text-ink-soft">
          For judicial review you need a “ground” — a specific legal problem with how the decision was
          made. There are {grounds.length} common ones. Each is explained in plain English, with everyday
          examples and what might relate to your situation.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {grounds.map((g) => (
            <Link
              key={g.id}
              href={`/learn/grounds/${g.id}`}
              className="rounded-pill border border-line bg-paper px-3.5 py-1.5 text-[13px] text-ink hover:border-rail-accent"
            >
              {g.plainName}
            </Link>
          ))}
        </div>
        <Link href="/learn/grounds" className="link-text mt-5 inline-block">Explore all grounds</Link>
      </section>

      <LearnTrust />
    </LearnContainer>
  );
}
