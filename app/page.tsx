import Link from "next/link";
import { useTranslations } from "next-intl";
import { listProcesses, listGrounds } from "@/lib/legal";
import { JsonLd } from "@/components/site/JsonLd";
import { itemListLd } from "@/lib/seo/jsonld";

/**
 * Landing (Direction K2 "Deep teal & sand") — the trust funnel: hero → numbered
 * how-it-works index → deadline band → trust band → Learn band → teal get-help band. One
 * primary action: "Find out what you can do" (/start). The brand rail, top nav, footer and
 * the persistent chat launcher are provided by SiteShell.
 *
 * The deadline band is illustrative and deliberately shows the RULE + "checked and
 * dated", never a computed countdown (BRD safety contract — no "X days left").
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
    { href: "/learn/merits-review", title: t("linkMeritsTitle"), desc: merits?.oneLine ?? "" },
    { href: "/learn/judicial-review", title: t("linkJudicialTitle"), desc: judicial?.oneLine ?? "" },
    { href: "/learn/grounds", title: t("linkGroundsTitle"), desc: t("linkGroundsDesc", { count: grounds.length }) },
    { href: "/learn/compare", title: t("linkCompareTitle"), desc: t("linkCompareDesc") },
  ];

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

      {/* ===== Deadline band (illustrative — rule, never a countdown) ===== */}
      <section aria-label={t("deadlineLabel")} className="container-wide py-6">
        <div className="flex flex-wrap items-center gap-5 rounded-deadline border border-gold-line bg-gold-soft px-6 py-6">
          <div className="flex h-[54px] w-[54px] flex-none items-center justify-center rounded-full border-2 border-gold">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8a5a14" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.18em] text-gold">{t("deadlineLabel")}</p>
            <p className="mt-1 font-display text-[22px] font-bold leading-[1.1] text-ink sm:text-[26px]">
              {t("deadlineRule")}
            </p>
            <p className="mt-1 text-meta text-ink-soft">{t("deadlineSub")}</p>
          </div>
          <Link href="/faq" className="link-text ml-auto whitespace-nowrap text-gold">
            {t("deadlineMore")}
          </Link>
        </div>
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

      {/* ===== Learn band (educational entry point — SEO: keyword copy + internal links) ===== */}
      <section aria-labelledby="learn-band-title" className="container-wide py-12">
        <p className="text-[11px] uppercase tracking-[0.28em] text-accent">{t("learnKicker")}</p>
        <h2
          id="learn-band-title"
          className="mt-3 max-w-[680px] font-display text-[28px] font-semibold leading-[1.1] text-ink sm:text-[34px]"
        >
          {t("learnTitle")}
        </h2>
        <p className="mt-4 max-w-[60ch] text-[15px] leading-[1.65] text-ink-soft">{t("learnLead")}</p>
        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          {learnLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="group rounded-card border border-line bg-paper p-5 transition-colors hover:border-rail-accent"
            >
              <h3 className="font-display text-[20px] font-semibold text-ink group-hover:text-accent">{l.title}</h3>
              {l.desc ? <p className="mt-1.5 text-[14.5px] leading-[1.55] text-ink-soft">{l.desc}</p> : null}
            </Link>
          ))}
        </div>
        <Link href="/learn" className="link-text mt-6 inline-block">{t("learnCta")}</Link>
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
