"use client";

import { useTranslations } from "next-intl";
import type { AvenueView } from "@/lib/triage";
import type { Process } from "@/lib/schemas/legal";
import type { ResultPlan, PathPlan, PathId } from "@/lib/analysis";
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
  chosen,
  onChoose,
  matchesGoal,
}: {
  plan: ResultPlan;
  avenue: AvenueView;
  meritsReview: Process;
  judicialReview: Process;
  deadline: { rule: string; sourceUrl?: string | null };
  tour?: boolean;
  /** The path the person has picked to work through, if they have picked one. */
  chosen?: PathId | null;
  onChoose?: (id: PathId) => void;
  /** Paths that answer what they said they were hoping for. A mapping, never a prediction. */
  matchesGoal?: (id: PathId) => boolean;
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

    {/* What the numbering on the cards MEANS for this scheme. It is not decoration: told
        that a Victorian fine must go to internal review before court, a person can miss the
        court-election window entirely. Only stated where the entry settles it — otherwise
        the neutral line, which claims order of consideration and nothing more. */}
    {plan.paths.length > 1 && (
      <p
        className={`mt-3 rounded-sticker border-2 px-4 py-2.5 text-[15px] leading-snug ${
          plan.pathsAre === "alternatives"
            ? "border-amber-border bg-amber-bg text-ink-soft"
            : "border-line bg-cream text-ink-soft"
        }`}
      >
        <span className="font-display font-black uppercase tracking-[0.08em] text-[12.5px] text-ink-faint">
          {t(
            plan.pathsAre === "sequence"
              ? "pathsAreSequenceLabel"
              : plan.pathsAre === "alternatives"
                ? "pathsAreAlternativesLabel"
                : "pathsAreUnknownLabel",
          )}
        </span>{" "}
        {t(
          plan.pathsAre === "sequence"
            ? "pathsAreSequence"
            : plan.pathsAre === "alternatives"
              ? "pathsAreAlternatives"
              : "pathsAreUnknown",
        )}
      </p>
    )}

    {plan.paths.length > 0 && (
      <ol className="mt-5 space-y-4">
        {plan.paths.map((p: PathPlan) => (
          <li key={p.id} className="rounded-card border-2 border-line bg-cream p-4 sm:p-5">
            {/* The goal match leads the card now, on its own line and at card width, rather
                than trailing a row of small pills where it was the easiest thing to miss.
                It is still a MAPPING — the goal step asked what they want, the corpus says
                which remedies each forum has, and this joins the two. It is not a view about
                how their matter will go, and it never says one path is better. */}
            {matchesGoal?.(p.id) && (
              <p className="-mx-4 -mt-4 mb-4 flex items-center gap-2 rounded-t-card border-b-2 border-help bg-help-soft px-4 py-2.5 font-display text-[14.5px] font-extrabold text-help-ink sm:-mx-5 sm:-mt-5 sm:px-5">
                <Icon.CheckSquare className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />
                {t("pathMatchesGoal")}
              </p>
            )}
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              {/* The step number, so the order reads as an order. What it means is set out
                  once above, for the whole scheme, rather than reasserted on every card. */}
              <span
                aria-hidden="true"
                className="chip !h-8 !w-8 !text-[13px]"
                style={{ background: "linear-gradient(135deg,#2B8A4B,#308371)" }}
              >
                {p.order}
              </span>
              <span className="font-display text-[12.5px] font-black uppercase tracking-[0.12em] text-red-ink">
                {t(plan.pathsAre === "alternatives" ? "pathOptionN" : "pathStepN", { n: p.order })}
              </span>
              <span className="mono text-ink-faint">{t("pathVia", { body: midSentence(p.body) })}</span>
              {/* The catch-all entries cover decisions we have no specific guide for, where
                  merits review exists only if the enabling Act provides it. The path still
                  shows — hiding it would keep the cheaper route from the people least able to
                  work out it might exist — but the condition travels with it. */}
              {/* Judicial review carries a different condition from merits review. Merits
                  review exists only where the enabling Act provides it; judicial review
                  supervises PUBLIC power, so the open question is who made the decision —
                  a housing entry covers both the department and a private provider. */}
              {p.conditional && (
                <span className="rounded-pill border-2 border-amber-border bg-amber-bg px-2.5 py-0.5 text-[13px] font-semibold text-ink-soft">
                  {t(
                    p.id === "judicial-review"
                      ? "pathConditionalJudicial"
                      : p.id === "internal-review"
                        ? "pathConditionalInternal"
                        : "pathConditional",
                  )}
                </span>
              )}
            </div>
            {/* "Merits review" is the name of a thing a TRIBUNAL does. Calling an internal
                review or a Magistrates' Court election by that name is wrong: an internal
                reviewer is inside the agency, and a court hearing a fine on election is not
                conducting merits review of an administrative decision. Where the body is not
                a tribunal, the card takes a neutral title and the caution below says what the
                body actually is. */}
            <h3 className="mt-1.5 font-display text-[19px] font-black text-ink">
              {p.id === "internal-review"
                ? t("pathTitleInternal")
                : p.id === "judicial-review"
                  ? judicialReview.name
                  : p.character === "tribunal"
                    ? meritsReview.name
                    : t("pathTitleNotTribunal")}
            </h3>

            {/* The question the forum decides — the foundation the whole path rests on.
                Empty for a body that is not a tribunal: the corpus holds the TRIBUNAL's
                question, and putting it on a departmental appeal says that appeal decides
                what is correct or preferable, which nobody has confirmed it does. */}
            {p.question && (
              <>
                <p className="mt-3 font-display text-[12.5px] font-black uppercase tracking-[0.12em] text-ink-faint">
                  {t("pathAsks")}
                </p>
                <p className="mt-1 font-display text-[18px] font-extrabold italic leading-snug text-ink">
                  “{p.question}”
                </p>
              </>
            )}

            {/* What that means for the material that matters — the strategy. */}
            <p className="mt-3.5 font-display text-[12.5px] font-black uppercase tracking-[0.12em] text-ink-faint">
              {t("pathFocus")}
            </p>
            <p className="mt-1 text-[15.5px] leading-relaxed text-ink-soft">{t(p.focusKey)}</p>

            {/* The scheme-specific test, supplied by the supervising lawyer. Everything else in
                this panel is the same for any decision; this is the part that is about THIS one,
                so it sits directly under the focus paragraph rather than in the two-column grid
                below, where it would read as a footnote. */}
            {p.criteria.length > 0 && (
              <>
                <p className="mt-3.5 font-display text-[12.5px] font-black uppercase tracking-[0.12em] text-ink-faint">
                  {t("pathCriteria")}
                </p>
                <ul className="mt-1.5 space-y-1.5 text-[15px] leading-snug text-ink-soft">
                  {p.criteria.map((x) => (
                    <li key={x} className="flex gap-2">
                      <span aria-hidden="true" className="mt-[8px] h-1.5 w-1.5 flex-none rounded-[2px] bg-accent" />
                      <span>{x}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {/* A non-tribunal body does not have a tribunal's powers. The merits avenue used
                to be typed only as "merits review", so the Housing Appeals Office — a
                departmental appeal — inherited the tribunal's remedies below, including
                setting a decision aside and substituting a new one. An internal reviewer
                cannot do that, and saying otherwise overstates both its independence and
                what a person can expect from it.

                COURTS ARE EXCLUDED, and the omission is the point of the condition. Keying
                this box on `character !== "tribunal"` caught two kinds of card it should
                never have caught.

                Judicial review, because `planFor` stamps every judicial-review path
                `character: "court"` — true and expected, the card is already about a court.
                So a warning reading "a court hearing the matter itself, not a review of the
                decision" printed on the judicial-review card of five of the six entries,
                three paragraphs under that same card's `focusJudicial`: "A court is not
                deciding whether the outcome was harsh or unfair. It looks at how the decision
                was made." The opposite of itself, on one card.

                And the fines court election, which needs the warning but already has it: the
                focus paragraph is now `focusCourt`, which says a court hears the matter
                itself and that free legal help beforehand is worth having. A second box
                repeating that in near-identical words three lines later is noise.

                What is left is the case the box was written for — a body in the MERITS slot
                whose powers we cannot state. It says the one thing no focus paragraph does:
                check what this body can actually do with your decision. */}
            {(p.character === "internal" || p.character === "mixed") && (
              <p className="mt-3.5 rounded-card border-2 border-amber-border bg-amber-bg px-3 py-2 text-[15px] leading-snug text-ink-soft">
                {t(p.character === "internal" ? "pathBodyInternal" : "pathBodyMixed")}
              </p>
            )}

            {/* Powers, where they are known. Suppressed entirely for a non-tribunal body
                rather than shown as a tribunal's — see planFor. */}
            {(p.canDo.length > 0 || p.cannotDo.length > 0) && (
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
            )}

            {/* Choosing a path is the person's, and everything after this follows from it:
                which points they are asked about, which application draft they get, and what
                the memorandum works through. The app orders the paths — merits review first
                where it exists, because only a tribunal can substitute the decision — but it
                does not choose, and it does not say which one suits their facts. */}
            {onChoose && (
              <div className="mt-4 border-t-2 border-line pt-4">
                <button
                  type="button"
                  aria-pressed={chosen === p.id}
                  onClick={() => onChoose(p.id)}
                  className={chosen === p.id ? "btn btn-primary" : "btn btn-secondary"}
                >
                  {chosen === p.id ? t("pathChosen") : t("pathChoose")}
                </button>
              </div>
            )}
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
            // The body named here is the one they picked to work through, where they have
            // picked one. It used to be the first path always, so someone who chose judicial
            // review still read step 3 telling them to lodge with the tribunal.
            title: t("step3", {
              body: midSentence(
                (chosen ? plan.paths.find((x) => x.id === chosen)?.body : undefined) ??
                  plan.primary?.body ??
                  t("helpTitle"),
              ),
            }),
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
