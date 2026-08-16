"use client";

import { useTranslations } from "next-intl";
import type { AvenueView } from "@/lib/triage";
import type { Process } from "@/lib/schemas/legal";
import type { ResultPlan, PathPlan } from "@/lib/analysis";
import { midSentence } from "@/lib/analysis";
import { Icon } from "@/components/ui/icons";

/**
 * "What this means for you" — the analysis layer.
 *
 * ONE component, used by both the /start result and the decode/ask result. It is the most
 * safety-sensitive surface in the product: it names which review paths apply, which forum
 * hears each, what that forum can and cannot do, and the time-limit rule. Two copies of it
 * would drift, and a drifted copy here misroutes someone.
 *
 * Everything substantive comes from the lawyer-verified sources — `planFor` decides which
 * paths apply and in what order, the corpus supplies the question each forum decides and
 * its remedies and limits, and the framing sentences live in `rights.*` in en.json so the
 * no-advice, no-score and reading-level linters cover them. Nothing here rates the person's
 * prospects or tells them what to do.
 *
 * `tour` is true only on /start: the guided walkthrough anchors on this section, and two
 * elements carrying the same `data-tour` would break it.
 */
export function AnalysisPanel({
  plan,
  avenue,
  meritsReview,
  judicialReview,
  deadline,
  tour = false,
}: {
  plan: ResultPlan;
  avenue: AvenueView;
  meritsReview: Process;
  judicialReview: Process;
  deadline: { rule: string; sourceUrl?: string | null };
  tour?: boolean;
}) {
  const t = useTranslations("rights");
  const av = avenue;
  const dl = deadline;
  return (
  <section
    id="r-analysis"
    {...(tour ? { "data-tour": "avenue", "data-tour-alt": "analysis" } : {})}
    className="card sticker" style={{ "--rot": "-0.5deg" } as React.CSSProperties}>
    <h2 className="font-display text-[21px] font-black text-ink">{t("analysisTitle")}</h2>
    <p className="mt-2.5 text-[16px] leading-relaxed text-ink-soft">{t(plan.leadKey)}</p>

    {/* No formal review path: say so plainly, and pass on whatever the pathway records
        as the endpoint (e.g. an internal complaint or an ombudsman). */}
    {plan.paths.length === 0 && (
      <ul className="mt-4 space-y-3">
        <li className="rounded-sticker bg-cream px-4 py-3 text-[15.5px] leading-snug text-ink-soft">
          {t("noReview")}
        </li>
        {av.noReviewEndpoint && (
          <li className="rounded-sticker bg-cream px-4 py-3 text-[15.5px] leading-snug text-ink-soft">
            {av.noReviewEndpoint}
          </li>
        )}
      </ul>
    )}

    {plan.paths.length > 0 && (
      <ol className="mt-5 space-y-4">
        {plan.paths.map((p: PathPlan) => (
          <li key={p.id} className="rounded-card border-2 border-line bg-cream p-4 sm:p-5">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-display text-[12.5px] font-black uppercase tracking-[0.12em] text-red-ink">
                {p.order === 1 ? t("pathOrderFirst") : t("pathOrderNext")}
              </span>
              <span className="mono text-ink-faint">{t("pathVia", { body: midSentence(p.body) })}</span>
            </div>
            <h3 className="mt-1.5 font-display text-[19px] font-black text-ink">
              {p.id === "merits-review" ? meritsReview.name : judicialReview.name}
            </h3>

            {/* The question the forum decides — the foundation the whole path rests on. */}
            <p className="mt-3 font-display text-[12.5px] font-black uppercase tracking-[0.12em] text-ink-faint">
              {t("pathAsks")}
            </p>
            <p className="mt-1 font-display text-[18px] font-extrabold italic leading-snug text-ink">
              “{p.question}”
            </p>

            {/* What that means for the material that matters — the strategy. */}
            <p className="mt-3.5 font-display text-[12.5px] font-black uppercase tracking-[0.12em] text-ink-faint">
              {t("pathFocus")}
            </p>
            <p className="mt-1 text-[15.5px] leading-relaxed text-ink-soft">{t(p.focusKey)}</p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="font-display text-[12.5px] font-black uppercase tracking-[0.12em] text-help-ink">
                  {t("pathCanDo")}
                </p>
                <ul className="mt-1.5 space-y-1.5 text-[15px] leading-snug text-ink-soft">
                  {p.canDo.map((x) => (
                    <li key={x} className="flex gap-2">
                      <span aria-hidden="true" className="mt-[8px] h-1.5 w-1.5 flex-none rounded-[2px] bg-help" />
                      <span>{x}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {p.cannotDo.length > 0 && (
                <div>
                  <p className="font-display text-[12.5px] font-black uppercase tracking-[0.12em] text-ink-faint">
                    {t("pathCannot")}
                  </p>
                  <ul className="mt-1.5 space-y-1.5 text-[15px] leading-snug text-ink-soft">
                    {p.cannotDo.map((x) => (
                      <li key={x} className="flex gap-2">
                        <span aria-hidden="true" className="mt-[8px] h-1.5 w-1.5 flex-none rounded-[2px] bg-ink-faint" />
                        <span>{x}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    )}

    {/* Time limits — amber and calm, a quiet line inside the analysis. Never red, never a
        countdown, never a headline: the rule plus its source, nothing that ticks. It sits
        HERE, above the sequence, because step 3 tells the reader it is named above. */}
    <p className="mt-5 flex items-start gap-2.5 rounded-sticker border-2 border-amber-border bg-amber-bg px-4 py-3 text-[14.5px] leading-relaxed text-ink-soft">
      <Icon.Clock className="mt-[3px] h-4 w-4 shrink-0 text-amber-ink" strokeWidth={2} aria-hidden />
      <span>
        <span className="font-display text-[13px] font-black uppercase tracking-[0.1em] text-amber-ink">
          {t("deadlineTitle")}:
        </span>{" "}
        {dl.rule}{" "}
        {dl.sourceUrl && (
          <a
            href={dl.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mono uppercase text-amber-ink underline underline-offset-[3px] hover:text-ink"
          >
            {t("deadlineSource")}
          </a>
        )}
      </span>
    </p>

    {/* The sequence — what people usually do, in order. */}
    <div className="mt-6 border-t-2 border-line pt-5">
      <h3 className="font-display text-[19px] font-black text-ink">{t("stepsTitle")}</h3>
      <p className="mt-1.5 text-[15.5px] leading-relaxed text-ink-soft">{t("stepsLead")}</p>
      <ol className="mt-4 space-y-3.5">
        {[
          { n: "01", title: t("step1"), body: t("step1Body") },
          { n: "02", title: t("step2"), body: t("step2Body") },
          {
            n: "03",
            title: t("step3", { body: midSentence(plan.primary?.body ?? t("helpTitle")) }),
            body: t("step3Body"),
          },
          { n: "04", title: t("step4"), body: t("step4Body") },
        ].map((s) => (
          <li key={s.n} className="flex gap-3.5">
            <span
              className="chip !h-9 !w-9 !text-[13px]"
              style={{ background: "linear-gradient(135deg,#2B8A4B,#308371)" }}
              aria-hidden="true"
            >
              {s.n}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-[16px] font-extrabold leading-snug text-ink">{s.title}</p>
              <p className="mt-0.5 text-[15px] leading-snug text-ink-soft">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  </section>
  );
}
