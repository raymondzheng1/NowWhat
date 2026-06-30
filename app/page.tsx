import Link from "next/link";
import { useTranslations } from "next-intl";
import { listProcesses, listGrounds } from "@/lib/legal";
import { JsonLd } from "@/components/site/JsonLd";
import { itemListLd } from "@/lib/seo/jsonld";

/**
 * Landing (Direction K2 "Deep teal & sand") — the trust funnel: hero → numbered
 * how-it-works index → trust band → Learn band → teal get-help band. One primary action:
 * "Find out what you can do" (/start). The brand rail, top nav, footer and the persistent
 * chat launcher are provided by SiteShell.
 *
 * Time limits are deliberately NOT headlined here (product decision, 2026-06-30): they are
 * not critical for our users, so they appear only as a brief, generic, Act-referencing note
 * inside the per-decision analysis on /start — never on the homepage, never a countdown.
 *
 * The Learn band is the educational entry point: keyword-rich copy + descriptive internal
 * links to the /learn library (the homepage is the highest-authority page, so this funnels
 * crawl + link equity to those pages) + ItemList structured data for richer results.
 */
export default function HomePage() {
  const t = useTranslations("home");

  const steps = [
    { n: "01", title: t("howStep1Title"), body: t("howStep1Body") },
    { n: "02", title: t("howStep2Title"), body: t("howStep2Body") },
    { n: "03", title: t("howStep3Title"), body: t("howStep3Body") },
  ];
  const trust = [
    { title: t("trust1Title"), body: t("trust1Body") },
    { title: t("trust2Title"), body: t("trust2Body") },
    { title: t("trust3Title"), body: t("trust3Body") },
    { title: t("trust4Title"), body: t("trust4Body") },
  ];

  const processes = listProcesses();
  const grounds = listGrounds();
  const merits = processes.find((p) => p.id === "merits-review");
  const judicial = processes.find((p) => p.id === "judicial-review");
  const learnLinks = [
    { href: "/learn/merits-review", kind: t("learnKindProcess"), title: t("linkMeritsTitle"), desc: merits?.oneLine ?? "" },
    { href: "/learn/judicial-review", kind: t("learnKindProcess"), title: t("linkJudicialTitle"), desc: judicial?.oneLine ?? "" },
    { href: "/learn/grounds", kind: t("learnKindGrounds"), title: t("linkGroundsTitle"), desc: t("linkGroundsDesc", { count: grounds.length }) },
    { href: "/learn/compare", kind: t("learnKindCompare"), title: t("linkCompareTitle"), desc: t("linkCompareDesc") },
  ];

  // Hairline borders for the bordered index grid (a tight 2×2 "library index", not floating
  // cards): stacked dividers on mobile, a + of dividers on desktop. Outer frame on the wrapper.
  const cellBorder = (i: number) =>
    [
      "border-line",
      i !== 0 ? "border-t" : "",
      "sm:border-t-0",
      i % 2 === 0 ? "sm:border-r" : "",
      i < learnLinks.length - 2 ? "sm:border-b" : "",
    ]
      .filter(Boolean)
      .join(" ");

  const learnLd = itemListLd({
    name: "How review works — understand your options",
    description:
      "Plain-English guides to challenging a government decision in Victoria or the Commonwealth: merits review, judicial review, and the grounds of review.",
    items: learnLinks.map((l) => ({ name: l.title, path: l.href })),
  });

  return (
    <div>
      <JsonLd data={learnLd} />
      {/* ===== Hero ===== */}
      <header className="container-wide pb-9 pt-8 sm:pt-16">
        <p className="text-[11px] uppercase tracking-[0.28em] text-accent">{t("heroEyebrow")}</p>
        <h1 className="mt-5 max-w-[760px] font-display text-[40px] font-semibold leading-[1.06] sm:text-display">
          {t("heroTitle")}
        </h1>
        <p className="mt-6 max-w-[560px] font-display text-[16px] leading-[1.7] text-ink-soft sm:text-lede">
          {t("heroLead")}
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4">
          <Link href="/start" className="btn-primary px-7">
            {t("ctaStart")}
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
          <Link href="/decode" className="link-text">
            {t("ctaScan")}
          </Link>
        </div>
      </header>

      {/* ===== Numbered "how it works" index ===== */}
      <section id="how" aria-label={t("howTitle")} className="container-wide scroll-mt-6 py-2">
        {steps.map((s, i) => (
          <div
            key={s.n}
            className={`flex flex-wrap items-baseline gap-x-6 gap-y-1 py-[22px] ${
              i === 0 ? "border-t border-line-strong" : "border-t border-line"
            } ${i === steps.length - 1 ? "border-b border-line" : ""}`}
          >
            <span className="w-[42px] flex-none font-display text-[22px] font-semibold text-accent">{s.n}</span>
            <h2 className="flex-none font-display text-[22px] font-bold text-ink sm:w-[240px]">{s.title}</h2>
            <p className="hidden flex-1 text-[14.5px] leading-[1.6] text-ink-soft sm:block">{s.body}</p>
          </div>
        ))}
      </section>

      {/* ===== Trust band ===== */}
      <section aria-label="What you can rely on" className="container-wide py-2">
        <div className="grid grid-cols-2 divide-x divide-y divide-line border-y border-line md:grid-cols-4 md:divide-y-0">
          {trust.map((c) => (
            <div key={c.title} className="p-5 sm:p-6">
              <h2 className="font-display text-[18px] font-bold text-ink">{c.title}</h2>
              <p className="mt-1 hidden text-meta leading-[1.5] text-ink-faint sm:block">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Learn band — the plain-English guide library (editorial index, SEO entry point) ===== */}
      <section aria-labelledby="learn-band-title" className="border-y border-line bg-sand-surface">
        <div className="container-wide grid gap-10 py-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:py-20">
          {/* Editorial intro */}
          <div className="lg:pr-4">
            <p className="text-[11px] uppercase tracking-[0.28em] text-accent">{t("learnKicker")}</p>
            <h2
              id="learn-band-title"
              className="mt-4 font-display text-[34px] font-semibold leading-[1.06] text-ink sm:text-[44px]"
            >
              {t("learnTitle")}{" "}
              <span className="font-normal italic text-accent">{t("learnTitleAccent")}</span>
            </h2>
            <p className="mt-6 max-w-[46ch] text-[15.5px] leading-[1.68] text-ink-soft">{t("learnLead")}</p>
            <Link href="/learn" className="btn-primary mt-8 px-6">
              {t("learnCta")}
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          </div>

          {/* Bordered index grid */}
          <div className="border border-line-strong bg-paper">
            <ul className="grid sm:grid-cols-2">
              {learnLinks.map((l, i) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className={`group flex h-full flex-col p-6 transition-colors hover:bg-sand-surface ${cellBorder(i)}`}
                  >
                    <span className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-accent">{l.kind}</span>
                    <h3 className="mt-2.5 font-display text-[21px] font-semibold leading-snug text-ink group-hover:text-accent">
                      {l.title}
                    </h3>
                    {l.desc ? (
                      <p className="mt-1.5 text-[13.5px] leading-[1.5] text-ink-soft">{l.desc}</p>
                    ) : null}
                    <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint transition-colors group-hover:text-accent">
                      Read
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ===== Get-help band (full-bleed teal) ===== */}
      <section aria-label={t("helpTitle")} className="mt-12 bg-rail text-rail-fg">
        <div className="container-wide flex flex-col gap-6 py-11 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-h2 font-semibold text-rail-fg">{t("helpTitle")}</h2>
            <p className="mt-1.5 max-w-[460px] text-[15px] text-rail-fg/80">{t("helpBody")}</p>
            <div className="mt-3.5 flex flex-wrap gap-2">
              <span className="rounded-pill bg-help px-3 py-1.5 text-[11px] uppercase tracking-[0.08em] text-white">
                {t("tier1")}
              </span>
              <span className="rounded-pill bg-rail-fg/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.08em] text-rail-fg">
                {t("tier2")}
              </span>
              <span className="rounded-pill bg-rail-fg/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.08em] text-rail-fg">
                {t("tier3")}
              </span>
            </div>
          </div>
          <Link href="/help" className="btn-accent whitespace-nowrap sm:flex-none">
            {t("helpCta")}
          </Link>
        </div>
      </section>
    </div>
  );
}
