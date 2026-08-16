import Link from "next/link";
import { useTranslations } from "next-intl";
import { listProcesses, listGrounds } from "@/lib/legal";
import { JsonLd } from "@/components/site/JsonLd";
import { itemListLd } from "@/lib/seo/jsonld";
import { PrivacyNote } from "@/components/ui/PrivacyNote";

/**
 * Landing — "sticker album" (design20260816). Stickers laid on cream paper: hero note +
 * two-line headline with a felt-tip marker on the turn, the single foil card (the ONLY
 * iridescent element on the page, reserved for the recommended action), three numbered
 * ways to start, the calm amber time-limit sticker paired with the dashed empty slot,
 * and the human-help card. The header/footer come from SiteShell.
 *
 * Rotations are deterministic per element (never randomised) and come from the handoff's
 * rotation scale. Anything absent/pending uses the dashed .slot-empty device; the time
 * limit is always amber and calm — never red, never a countdown.
 *
 * NOTE ON THE TIME-LIMIT CARD: the design reference hard-codes "Usually 28 days". We show
 * the same device with the posture instead of a figure — the data layer is lawyer-confirmed
 * to state time limits generically, and this product never asserts a legal figure without
 * a source attached to the specific decision.
 */
export default function HomePage() {
  const t = useTranslations("home");

  const processes = listProcesses();
  const grounds = listGrounds();
  const merits = processes.find((p) => p.id === "merits-review");
  const judicial = processes.find((p) => p.id === "judicial-review");

  const ways = [
    {
      href: "/start",
      n: "01",
      gradient: "linear-gradient(135deg,#2B8A4B,#308371)",
      title: t("way1Title"),
      body: t("way1Body"),
      cta: t("way1Cta"),
      rot: "-1.5deg",
    },
    {
      href: "/decode",
      n: "02",
      gradient: "linear-gradient(135deg,#2F6FBF,#308371)",
      title: t("way2Title"),
      body: t("way2Body"),
      cta: t("way2Cta"),
      rot: "0.9deg",
    },
    {
      href: "/ask",
      n: "03",
      gradient: "linear-gradient(135deg,#7A4FB3,#B75681)",
      title: t("way3Title"),
      body: t("way3Body"),
      cta: t("way3Cta"),
      rot: "2.2deg",
    },
  ];

  const learnLinks = [
    { href: "/learn/merits-review", title: t("linkMeritsTitle"), desc: merits?.oneLine ?? "" },
    { href: "/learn/judicial-review", title: t("linkJudicialTitle"), desc: judicial?.oneLine ?? "" },
    { href: "/learn/grounds", title: t("linkGroundsTitle"), desc: t("linkGroundsDesc", { count: grounds.length }) },
    { href: "/learn/compare", title: t("linkCompareTitle"), desc: t("linkCompareDesc") },
  ];

  const learnLd = itemListLd({
    name: "How review works — understand your options",
    description:
      "Plain-English guides to challenging an Australian government decision: merits review, judicial review, and the grounds of review.",
    items: learnLinks.map((l) => ({ name: l.title, path: l.href })),
  });

  return (
    <div>
      <JsonLd data={learnLd} />

      {/* ===== Hero ===== */}
      <section className="container-wide grid items-start gap-10 pb-12 pt-12 lg:grid-cols-[1.25fr_1fr] lg:gap-[52px] lg:pt-16">
        <div>
          <p className="note mb-3.5 -rotate-1.4">{t("heroNote")}</p>
          {/* One h1, two visual lines: the design sets these as separate lines, but a page
              must have a single top-level heading for screen readers and search. */}
          <h1 className="mb-7 text-display">
            <span className="block">{t("heroTitle")}</span>
            <span className="block">
              {t("heroTitle2a")} <span className="marker">{t("heroTitle2b")}</span>
            </span>
          </h1>
          <p className="mb-6 max-w-[560px] text-lede text-ink-soft [text-wrap:pretty]">{t("heroLead")}</p>
          <PrivacyNote>{t("lockLine")}</PrivacyNote>
        </div>

        {/* The foil card — the ONLY iridescent element on this page. */}
        <div className="foil rotate-1.6">
          <div className="foil-inner">
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2.5">
              <span className="eyebrow">{t("foilLabel")}</span>
              <span className="note text-[20px]">{t("foilNote")}</span>
            </div>
            <h2 className="mb-2 text-h2">{t("foilTitle")}</h2>
            <p className="mb-4.5 text-[15px] leading-relaxed text-ink-soft">{t("foilBody")}</p>
            <Link href="/start" className="btn btn-primary mb-2.5 w-full">
              {t("ctaStart")} <span aria-hidden="true">→</span>
            </Link>
            <Link href="/decode" className="btn btn-secondary w-full !min-h-[48px]">
              {t("ctaScan")}
            </Link>
          </div>
        </div>
      </section>

      {/* ===== Three ways to start ===== */}
      <section className="container-wide pb-14">
        <p className="note mb-4 -rotate-0.8">{t("waysNote")}</p>
        <ul className="grid gap-[26px] md:grid-cols-3">
          {ways.map((w) => (
            <li key={w.href}>
              <Link
                href={w.href}
                className="card sticker flex h-full flex-col gap-3 !p-[22px] text-ink-soft"
                style={{ "--rot": w.rot } as React.CSSProperties}
              >
                <span className="chip" style={{ background: w.gradient }} aria-hidden="true">
                  {w.n}
                </span>
                <span className="font-display text-title font-black text-ink">{w.title}</span>
                <span className="flex-1 text-sm">{w.body}</span>
                <span className="link-text">
                  {w.cta} <span aria-hidden="true">→</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ===== What we cover — the two governments, named plainly. Doubles as the page's
           public-law keyword surface (merits review / judicial review / ART / VCAT). ===== */}
      <section aria-labelledby="coverage-title" className="container-wide pb-14">
        <p className="note mb-4 rotate-0.6">{t("coverageNote")}</p>
        <h2 id="coverage-title" className="mb-3 text-h2">{t("coverageTitle")}</h2>
        <p className="mb-7 max-w-[64ch] text-body text-ink-soft">{t("coverageLead")}</p>
        <div className="grid gap-[26px] md:grid-cols-2">
          {[
            {
              label: t("covCthLabel"),
              title: t("covCthTitle"),
              body: t("covCthBody"),
              rot: "-1.1deg",
              gradient: "linear-gradient(135deg,#2F6FBF,#308371)",
            },
            {
              label: t("covVicLabel"),
              title: t("covVicTitle"),
              body: t("covVicBody"),
              rot: "0.9deg",
              gradient: "linear-gradient(135deg,#7A4FB3,#B75681)",
            },
          ].map((c) => (
            <div
              key={c.title}
              className="card sticker flex gap-4 !p-[22px]"
              style={{ "--rot": c.rot } as React.CSSProperties}
            >
              {/* A word, not a number — so this is a gradient tag, not the fixed 44px chip
                  (which clips anything longer than "01"). */}
              <span
                className="inline-flex h-fit shrink-0 items-center rounded-sticker px-3 py-2 font-display text-[11px] font-black uppercase tracking-[0.08em] text-white shadow-chip"
                style={{ background: c.gradient }}
                aria-hidden="true"
              >
                {c.label}
              </span>
              <div className="min-w-0">
                <h3 className="font-display text-[19px] font-black leading-snug text-ink">{c.title}</h3>
                <p className="mt-1.5 text-sm text-ink-soft">{c.body}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-5 max-w-[64ch] text-sm text-ink-faint">{t("covFoot")}</p>
      </section>

      {/* ===== Time limit (always amber + calm) + the empty slot ===== */}
      <section className="container-wide grid gap-[26px] pb-14 md:grid-cols-2">
        <div
          className="sticker rounded-card border-2 border-amber-border bg-amber-bg p-[22px]"
          style={{ "--rot": "-0.6deg" } as React.CSSProperties}
        >
          <p className="mb-2 flex items-center gap-2 font-display text-label font-black uppercase text-amber-ink">
            <span aria-hidden="true" className="text-[14px]">◔</span>
            {t("limitLabel")}
          </p>
          <p className="mb-1.5 font-display text-[19px] font-extrabold text-ink">{t("limitTitle")}</p>
          <p className="text-sm text-ink-soft">{t("limitBody")}</p>
          <p className="mono mt-2.5 uppercase text-amber-ink">{t("limitSource")}</p>
        </div>

        <div
          className="slot-empty flex flex-col justify-center p-[22px]"
          style={{ transform: "rotate(1.1deg)" }}
        >
          <p className="mb-2 font-display text-label font-black uppercase text-red-deep">{t("slotLabel")}</p>
          <p className="mb-1.5 font-display text-[19px] font-extrabold text-ink">{t("slotTitle")}</p>
          <p className="text-sm text-ink-soft">{t("slotBody")}</p>
          <p className="note mt-2 -rotate-1 text-[21px]">{t("slotNote")}</p>
        </div>
      </section>

      {/* ===== Humans ===== */}
      <section className="container-wide pb-14">
        <div
          className="card sticker flex flex-wrap items-center gap-6 !p-[26px] shadow-raised"
          style={{ "--rot": "-0.7deg" } as React.CSSProperties}
        >
          <div className="min-w-[300px] flex-1">
            <h2 className="mb-1 text-[24px]">{t("humansTitle")}</h2>
            <p className="mb-2.5 text-sm text-ink-soft">{t("humansBody")}</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: t("humansPill1"), rot: "-0.8deg" },
                { label: t("humansPill2"), rot: "0.6deg" },
                { label: t("humansPill3"), rot: "-0.6deg" },
              ].map((p) => (
                <span
                  key={p.label}
                  className="pill bg-cream text-ink-soft"
                  style={{ transform: `rotate(${p.rot})` }}
                >
                  {p.label}
                </span>
              ))}
            </div>
          </div>
          <Link
            href="/help"
            className="btn btn-primary sticker !shadow-none"
            style={{ "--rot": "1.2deg" } as React.CSSProperties}
          >
            {t("humansCta")} <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      {/* ===== Guide library (SEO entry point: descriptive internal links) ===== */}
      <section aria-labelledby="learn-band-title" className="container-wide pb-16">
        <p className="note mb-4 rotate-0.7">{t("learnKicker")}</p>
        <h2 id="learn-band-title" className="mb-6 max-w-[720px] text-h2">
          {t("learnTitle")} <span className="text-red-ink">{t("learnTitleAccent")}</span>
        </h2>
        <ul className="grid gap-[26px] sm:grid-cols-2">
          {learnLinks.map((l, i) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="card sticker flex h-full flex-col gap-1.5 text-ink-soft"
                style={{ "--rot": ["-0.9deg", "0.8deg", "1.1deg", "-1.2deg"][i] } as React.CSSProperties}
              >
                <span className="font-display text-[19px] font-black text-ink">{l.title}</span>
                {l.desc ? <span className="text-sm">{l.desc}</span> : null}
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/learn" className="link-text mt-6 inline-flex">
          {t("learnCta")} <span aria-hidden="true">→</span>
        </Link>
      </section>
    </div>
  );
}
