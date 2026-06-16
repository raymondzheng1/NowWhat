import Link from "next/link";
import { useTranslations } from "next-intl";
import { Eyebrow, BrassRule } from "@/components/ui/Eyebrow";
import { PrivacyNote } from "@/components/ui/PrivacyNote";
import { Icon } from "@/components/ui/icons";

/**
 * Landing (Direction C "Chambers") — trust funnel: hero + payoff teaser → trust band →
 * how-it-works → navy get-help strip → footer. One primary action: the wizard at /start.
 */
export default function HomePage() {
  const t = useTranslations("home");

  const trust = [
    { icon: Icon.ListLines, title: t("trust1Title"), body: t("trust1Body") },
    { icon: Icon.ShieldCheck, title: t("trust2Title"), body: t("trust2Body") },
    { icon: Icon.People, title: t("trust3Title"), body: t("trust3Body") },
  ];
  const steps = [
    { n: 1, title: t("howStep1Title"), body: t("howStep1Body") },
    { n: 2, title: t("howStep2Title"), body: t("howStep2Body") },
    { n: 3, title: t("howStep3Title"), body: t("howStep3Body") },
  ];

  return (
    <div>
      {/* ===== Hero ===== */}
      <section className="bg-paper-warm">
        <div className="container-wide grid gap-10 py-12 sm:py-14 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-12">
          <div>
            <Eyebrow>{t("heroEyebrow")}</Eyebrow>
            <h1 className="mt-4 font-serif text-[28px] font-bold leading-tight text-navy-ink sm:text-display">
              {t("heroTitle")}
            </h1>
            <p className="mt-4 max-w-[34rem] text-lead text-ink-soft">{t("heroLead")}</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/start" className="btn-primary btn-lg w-full shadow-cta sm:w-auto">
                {t("ctaStart")} →
              </Link>
              <Link href="/ask" className="btn-secondary btn-lg w-full sm:w-auto">
                {t("ctaAsk")}
              </Link>
            </div>
            <PrivacyNote className="mt-5">We never keep your letter or your details.</PrivacyNote>
          </div>

          {/* Payoff teaser — hidden on mobile (as in the reference) */}
          <div className="hidden lg:block">
            <div className="rounded-panel border border-line-card bg-paper p-6 shadow-card">
              <span className="flex flex-col gap-2">
                <BrassRule />
                <span className="eyebrow">{t("teaserEyebrow")}</span>
              </span>
              <div className="mt-4 flex items-center gap-3 rounded-icon border border-gold-line bg-gold-soft p-3">
                <div className="font-serif text-[23px] font-bold leading-[1.12] text-gold-strong">
                  Tue 8 July
                  <br />
                  2025
                </div>
                <div className="rounded-button border border-gold-line bg-paper px-3 py-2 text-center">
                  <div className="font-serif text-[23px] font-bold leading-none text-gold">14</div>
                  <div className="mt-0.5 text-[9.5px] font-bold uppercase tracking-[0.07em] text-gold-text">
                    days left
                  </div>
                </div>
              </div>
              <ul className="mt-4 space-y-2.5">
                {[t("teaser1"), t("teaser2"), t("teaser3")].map((x) => (
                  <li key={x} className="flex items-start gap-2.5 text-[14.5px] text-ink-soft">
                    <Icon.CheckSquare className="h-5 w-5 shrink-0 text-navy" strokeWidth={2} />
                    {x}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Trust band ===== */}
      <section className="bg-paper">
        <div className="container-wide py-12">
          <div className="overflow-hidden rounded-card border border-line-card sm:grid sm:grid-cols-3 sm:divide-x sm:divide-line-card">
            {trust.map(({ icon: Glyph, title, body }) => (
              <div
                key={title}
                className="flex items-start gap-4 border-b border-line p-5 last:border-b-0 sm:block sm:border-b-0 sm:p-6"
              >
                <Glyph className="h-7 w-7 shrink-0 text-navy sm:mb-3" strokeWidth={1.8} />
                <div>
                  <h3 className="font-serif text-h3 font-bold text-ink">{title}</h3>
                  <p className="mt-1 text-sm text-ink-soft">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== How it works ===== */}
      <section id="how" className="scroll-mt-24 bg-paper-warm">
        <div className="container-wide py-12">
          <Eyebrow>{t("howEyebrow")}</Eyebrow>
          <h2 className="mt-3 font-serif text-h2 font-bold text-navy-ink">{t("howTitle")}</h2>
          <ol className="mt-8 grid gap-8 sm:grid-cols-3">
            {steps.map((s) => (
              <li key={s.n}>
                <div className="flex h-[38px] w-[38px] items-center justify-center rounded-full border-[1.5px] border-brass font-serif text-[17px] font-bold text-navy">
                  {s.n}
                </div>
                <h3 className="mt-3.5 font-serif text-[17.5px] font-bold text-ink">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ===== Get-help strip ===== */}
      <section className="bg-navy">
        <div className="container-wide flex flex-col gap-5 py-11 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-serif text-[23px] font-bold text-white">{t("helpTitle")}</h2>
            <p className="mt-1.5 text-[15px] text-[#aebfd2]">{t("helpBody")}</p>
          </div>
          <Link href="/help" className="btn-brass btn-lg w-full sm:w-auto">
            {t("helpCta")}
          </Link>
        </div>
      </section>
    </div>
  );
}
