"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { listDataEntries, getDataEntry } from "@/lib/data";
import type { DataPathway, Jurisdiction } from "@/lib/schemas/data";
import type { Process, Ground } from "@/lib/schemas/legal";
import { avenueView } from "@/lib/triage";
import { deadlineRuleView } from "@/lib/deadline/rule";
import { reasonsRequestTemplate, REASONS_CLOCK_WARNING } from "@/lib/reasons";
import { checkTripwire, TRIPWIRE_MESSAGES, type TripwireFlags } from "@/lib/tripwire";
import { buildHandoff } from "@/lib/handoff";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { PrivacyNote } from "@/components/ui/PrivacyNote";
import { useTour } from "@/components/feature/tour/useTour";
import { TOUR_START_WHO, TOUR_START_WHAT, TOUR_START_RESULT } from "@/lib/tour/steps";
import { Crest } from "@/components/ui/Wordmark";
import { Icon, type IconName } from "@/components/ui/icons";
import { ProcessExplainer } from "@/components/feature/learn/ProcessExplainer";
import { GroundsExplorer } from "@/components/feature/learn/GroundsExplorer";

type Step = "who" | "what" | "result";

const AREA_ICON: Record<string, IconName> = {
  "vic-renting": "House",
  "vic-fines": "Receipt",
  "vic-public-housing": "Apartments",
  "cth-centrelink": "Document",
  "vic-generic": "Document",
  "cth-generic": "Document",
};

/** Deterministic sticker rotations, cycled across the area tiles. Never randomised. */
const AREA_ROT = ["-1.2deg", "0.8deg", "-0.7deg", "1.1deg"] as const;

/** AA-safe sticker-face gradients (white glyphs sit on these), cycled with the tiles. */
const AREA_CHIP = [
  "linear-gradient(135deg,#2B8A4B,#308371)",
  "linear-gradient(135deg,#2F6FBF,#308371)",
  "linear-gradient(135deg,#7A4FB3,#B75681)",
] as const;

/**
 * The double-ring keyboard focus indicator, re-applied as a utility.
 * `:focus-visible` in globals.css sets `outline: none` plus a box-shadow ring, but it
 * lives in the BASE layer — so any element carrying .sticker / .card / .btn-* (all of
 * which declare their own box-shadow in the COMPONENTS layer, at equal specificity but
 * later in the sheet) silently swallows the ring and shows no focus at all. Utilities
 * come last, so this restores it. Same two colours as the base rule (#FFFFFF + --ink).
 */

const FLAG_KEYS: { key: keyof TripwireFlags; label: string; hint?: string }[] = [
  // The family/mental-health flag is the one people over-tick: it must read as "the
  // DECISION is one of these", not "my life involves one of these", or the Centrelink,
  // housing and fines users this service exists for get handed away.
  { key: "family", label: "flagFamily", hint: "flagFamilyHint" },
  { key: "criminal", label: "flagCriminal" },
  { key: "detention", label: "flagDetention" },
  { key: "migration", label: "flagMigration" },
  { key: "hearingBooked", label: "flagHearing" },
  { key: "deadlineImminentOrPassed", label: "flagDeadline" },
];

export function RightsSaverClient({
  meritsReview,
  judicialReview,
  jrGrounds,
}: {
  meritsReview: Process;
  judicialReview: Process;
  jrGrounds: Ground[];
}) {
  const t = useTranslations("rights");
  const allEntries = useMemo(() => listDataEntries(), []);

  const [step, setStep] = useState<Step>("who");
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction | null>(null);
  const [areaId, setAreaId] = useState<string | null>(null);
  const [decisionDate, setDecisionDate] = useState("");
  const [flags, setFlags] = useState<TripwireFlags>({});
  const [consent, setConsent] = useState(false);
  const [copied, setCopied] = useState(false);
  // Grounds the person marked as possibly relating to their situation (neutral; →handoff).
  const [relatedGrounds, setRelatedGrounds] = useState<string[]>([]);

  // Deep link / chat handoff: /start?jur=Vic&area=vic-renting&date=YYYY-MM-DD
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const jur = p.get("jur");
    const area = p.get("area");
    const date = p.get("date");
    if (jur === "Vic" || jur === "Cth") setJurisdiction(jur);
    if (area && getDataEntry(area)) {
      setAreaId(area);
      const e = getDataEntry(area);
      if (e && (jur === "Vic" || jur === "Cth" || !jur)) setJurisdiction(e.jurisdiction);
    }
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) setDecisionDate(date);
    if (area && getDataEntry(area)) setStep("what");
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const areas = jurisdiction
    ? allEntries
        .filter((e) => e.jurisdiction === jurisdiction)
        .sort((a, b) => Number(a.isFallback) - Number(b.isFallback))
    : [];
  const entry = areaId ? getDataEntry(areaId) ?? null : null;

  function reset() {
    setStep("who");
    setJurisdiction(null);
    setAreaId(null);
    setDecisionDate("");
    setFlags({});
    setConsent(false);
    setRelatedGrounds([]);
  }

  function toggleGround(id: string) {
    setRelatedGrounds((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));
  }

  const stepNo = step === "who" ? 1 : step === "what" ? 2 : 3;

  // One guide per wizard step, gated on that step being visible: advancing tears the old
  // tour down and auto-starts the next, with no manual driver navigation (harness §14.11).
  const replayWho = useTour("start-who", TOUR_START_WHO, step === "who");
  const replayWhat = useTour("start-what", TOUR_START_WHAT, step === "what");
  const replayResult = useTour("start-result", TOUR_START_RESULT, step === "result");
  const replay = step === "who" ? replayWho : step === "what" ? replayWhat : replayResult;

  return (
    <div className="min-h-screen">
      <FocusedHeader
        stepNo={stepNo}
        t={t}
        onReset={step === "result" ? reset : undefined}
        onReplayGuide={replay}
      />

      <div className="px-[22px] py-8 sm:px-10 sm:py-12">
        <div key={step} className="wn-step mx-auto max-w-[820px]">
          {step === "who" && (
            <WhoStep
              t={t}
              onPick={(j) => {
                setJurisdiction(j);
                setAreaId(null);
                setStep("what");
              }}
            />
          )}

          {step === "what" && jurisdiction && (
            <WhatStep
              t={t}
              areas={areas}
              areaId={areaId}
              setAreaId={setAreaId}
              decisionDate={decisionDate}
              setDecisionDate={setDecisionDate}
              today={today}
              flags={flags}
              setFlags={setFlags}
              consent={consent}
              setConsent={setConsent}
              onBack={() => setStep("who")}
              onContinue={() => setStep("result")}
            />
          )}

          {step === "result" && entry && jurisdiction && (
            <ResultStep
              t={t}
              entry={entry}
              jurisdiction={jurisdiction}
              decisionDate={decisionDate}
              flags={flags}
              copied={copied}
              setCopied={setCopied}
              meritsReview={meritsReview}
              judicialReview={judicialReview}
              jrGrounds={jrGrounds}
              relatedGrounds={relatedGrounds}
              onToggleGround={toggleGround}
            />
          )}

          <div data-tour="privacy-note" className="mt-6 flex justify-center">
            <PrivacyNote center>{t("privacy")}</PrivacyNote>
          </div>
        </div>
      </div>
    </div>
  );
}

function FocusedHeader({
  stepNo,
  t,
  onReset,
  onReplayGuide,
}: {
  stepNo: number;
  t: ReturnType<typeof useTranslations>;
  onReset?: () => void;
  onReplayGuide?: () => void;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2.5 border-b-2 border-ink px-[22px] py-4 sm:px-10">
      <Link
        href="/"
        aria-label="Home"
        className="sticker inline-flex items-center gap-2.5 rounded-sticker bg-paper px-3 py-2"
        style={{ "--rot": "-1.2deg" } as React.CSSProperties}
      >
        <Crest size={26} />
        <span className="hidden font-display text-[16px] font-black text-ink sm:inline">
          What Now<span className="text-red-ink">?</span>
        </span>
      </Link>
      <span className="inline-flex items-center rounded-pill bg-cream-deep px-3.5 py-2 font-display text-[12px] font-extrabold uppercase tracking-[0.1em] text-ink sm:text-[12.5px]">
        {t("stepOf", { n: stepNo })}
      </span>
      <div className="flex items-center gap-2 sm:gap-3">
        {onReplayGuide && (
          <button
            type="button"
            onClick={onReplayGuide}
            className="hidden min-h-[44px] items-center px-1 font-display text-[12.5px] font-extrabold uppercase tracking-[0.08em] text-ink-soft hover:text-ink sm:inline-flex"
          >
            {t("showMeHow")}
          </button>
        )}
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex min-h-[44px] items-center px-1 font-display text-[12.5px] font-extrabold uppercase tracking-[0.08em] text-red-ink hover:text-ink"
          >
            {t("startOver")}
          </button>
        )}
        <Link
          href="/"
          aria-label={t("close")}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sticker border-2 border-ink bg-paper text-ink"
        >
          <Icon.Close className="h-5 w-5" strokeWidth={2.2} />
        </Link>
      </div>
    </header>
  );
}

function WhoStep({
  t,
  onPick,
}: {
  t: ReturnType<typeof useTranslations>;
  onPick: (j: Jurisdiction) => void;
}) {
  const opts: { j: Jurisdiction; title: string; desc: string }[] = [
    // Commonwealth first: it is the national picture and the most common entry point
    // (Centrelink). The state option follows as the equivalent, not a rival half.
    { j: "Cth", title: t("whoCth"), desc: t("whoCthDesc") },
    { j: "Vic", title: t("whoVic"), desc: t("whoVicDesc") },
  ];
  return (
    <>
      <h1 className="font-display text-[30px] font-black leading-[1.05] text-ink sm:text-[40px]">{t("whoTitle")}</h1>
      <p className="mt-3 max-w-[560px] text-[17px] text-ink-soft">{t("whoHelp")}</p>
      <div data-tour="who-options" className="mt-7 grid gap-5 sm:grid-cols-2">
        {opts.map((o, i) => (
          <button
            key={o.j}
            type="button"
            onClick={() => onPick(o.j)}
            className="card sticker text-left"
            style={{ "--rot": i === 0 ? "-1.5deg" : "0.9deg" } as React.CSSProperties}
          >
            <span className="flex items-start justify-between gap-3">
              <span className="font-display text-[21px] font-black leading-tight text-ink">{o.title}</span>
              <span aria-hidden="true" className="font-display text-[19px] font-black text-red-ink">
                →
              </span>
            </span>
            <span className="mt-2 block text-[15.5px] leading-snug text-ink-soft">{o.desc}</span>
          </button>
        ))}
      </div>
    </>
  );
}

function WhatStep({
  t,
  areas,
  areaId,
  setAreaId,
  decisionDate,
  setDecisionDate,
  today,
  flags,
  setFlags,
  consent,
  setConsent,
  onBack,
  onContinue,
}: {
  t: ReturnType<typeof useTranslations>;
  areas: DataPathway[];
  areaId: string | null;
  setAreaId: (s: string) => void;
  decisionDate: string;
  setDecisionDate: (s: string) => void;
  today: string;
  flags: TripwireFlags;
  setFlags: (f: TripwireFlags) => void;
  consent: boolean;
  setConsent: (b: boolean) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const canContinue = !!areaId && consent;
  return (
    <>
      <h1 className="font-display text-[30px] font-black leading-[1.05] text-ink sm:text-[40px]">{t("whatTitle")}</h1>
      <p className="mt-3 max-w-[560px] text-[17px] text-ink-soft">{t("whatHelp")}</p>

      <div data-tour="area-cards" className="mt-7 grid gap-5 sm:grid-cols-2">
        {areas.map((e, i) => {
          const Glyph = Icon[AREA_ICON[e.id] ?? "Document"];
          const active = areaId === e.id;
          return (
            <button
              key={e.id}
              type="button"
              aria-pressed={active}
              onClick={() => setAreaId(e.id)}
              className={`card sticker flex items-center gap-3.5 p-4 text-left sm:p-5 ${
                active ? "border-2 border-ink shadow-raised" : "border-2 border-transparent"
              }`}
              style={{ "--rot": AREA_ROT[i % AREA_ROT.length] } as React.CSSProperties}
            >
              <span className="chip" style={{ background: AREA_CHIP[i % AREA_CHIP.length] }}>
                <Glyph className="h-6 w-6 text-white" strokeWidth={1.9} />
              </span>
              <span className="min-w-0 flex-1 font-display text-[16.5px] font-extrabold leading-snug text-ink">
                {e.title}
              </span>
              <span
                aria-hidden="true"
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[13px] font-black leading-none ${
                  active ? "bg-ink text-cream-onRed" : "border-2 border-line text-transparent"
                }`}
              >
                ✓
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 space-y-5">
        {/* Form surfaces stay square on the paper — only standalone cards get a tilt. */}
        <label data-tour="decision-date" className="card block">
          <span className="mb-2 block font-display text-[15px] font-extrabold text-ink">{t("dateLabel")}</span>
          <input
            type="date"
            max={today}
            value={decisionDate}
            onChange={(e) => setDecisionDate(e.target.value)}
            className="input sm:w-auto"
          />
        </label>

        <fieldset data-tour="tripwire" className="card">
          {/* float-left + w-full takes the legend OFF the fieldset's top border (its default
              rendering) and lays it out as a normal block heading; the help text clears it. */}
          <legend className="float-left mb-1.5 w-full font-display text-[19px] font-black text-ink">
            {t("checkTitle")}
          </legend>
          <p className="clear-both text-[15.5px] leading-relaxed text-ink-soft">{t("checkHelp")}</p>
          <div className="mt-3 space-y-1">
            {FLAG_KEYS.map(({ key, label, hint }) => (
              <label
                key={key}
                /* py + min-h keeps each row a >= 44px tap target on a phone. */
                className="flex min-h-[44px] items-start gap-3 py-2.5 text-[15.5px] leading-snug text-ink"
              >
                <input
                  type="checkbox"
                  checked={!!flags[key]}
                  onChange={(e) => setFlags({ ...flags, [key]: e.target.checked })}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-ink"
                />
                <span>
                  {t(label)}
                  {hint && (
                    <span className="mt-1 block text-[14.5px] leading-snug text-ink-faint">
                      {t(hint)}
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* The consent gate carries a 2px ink frame — it is a required safety surface. */}
        <label
          data-tour="consent"
          className="card flex items-start gap-3 border-2 border-ink text-[15.5px] leading-snug text-ink"
        >
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-ink"
          />
          <span>{t("consent")}</span>
        </label>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-[44px] items-center gap-2 px-1 font-display text-[13px] font-extrabold uppercase tracking-[0.08em] text-ink-soft hover:text-ink"
        >
          ← {t("back")}
        </button>
        <button
          type="button"
          onClick={onContinue}
          disabled={!canContinue}
          className="btn btn-primary btn-lg sticker px-8 disabled:opacity-50"
          style={{ "--rot": "0.8deg" } as React.CSSProperties}
        >
          {t("see")} →
        </button>
      </div>
    </>
  );
}

function ResultStep({
  t,
  entry,
  jurisdiction,
  decisionDate,
  flags,
  copied,
  setCopied,
  meritsReview,
  judicialReview,
  jrGrounds,
  relatedGrounds,
  onToggleGround,
}: {
  t: ReturnType<typeof useTranslations>;
  entry: DataPathway;
  jurisdiction: Jurisdiction;
  decisionDate: string;
  flags: TripwireFlags;
  copied: boolean;
  setCopied: (b: boolean) => void;
  meritsReview: Process;
  judicialReview: Process;
  jrGrounds: Ground[];
  relatedGrounds: string[];
  onToggleGround: (id: string) => void;
}) {
  const trip = checkTripwire({ jurisdiction, flags, entry });

  // --- Tripwire: stop and route to a person (no builder output) ---
  if (trip.stop) {
    return (
      <div className="space-y-6">
        <Disclaimer />
        {/* A warm hand-over, never an error: green help tones, a friendly glyph, no alarm. */}
        <div
          className="sticker rounded-card border-2 border-help bg-help-soft p-5 sm:p-6"
          style={{ "--rot": "-0.9deg" } as React.CSSProperties}
        >
          <div className="flex items-start gap-4">
            <span className="chip" style={{ background: "linear-gradient(135deg,#2B8A4B,#308371)" }}>
              <Icon.People className="h-6 w-6 text-white" strokeWidth={1.9} />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-[24px] font-black leading-tight text-help-ink sm:text-[28px]">
                {t("routeTitle")}
              </h1>
              <p className="mt-2 text-[16px] leading-relaxed text-help-ink">{t("routeBody")}</p>
            </div>
          </div>
          <ul className="mt-4 space-y-2 text-[15.5px] leading-snug text-help-ink">
            {trip.reasons.map((r) => (
              <li key={r} className="flex gap-2.5">
                <span aria-hidden="true" className="mt-[9px] h-1.5 w-1.5 flex-none rounded-[2px] bg-help" />
                <span>{TRIPWIRE_MESSAGES[r]}</span>
              </li>
            ))}
          </ul>
        </div>
        <HelpList t={t} entry={entry} />
      </div>
    );
  }

  const av = avenueView(entry);
  const dl = deadlineRuleView(entry);
  const template = reasonsRequestTemplate(entry, {
    about: entry.title.toLowerCase(),
    decisionDate: decisionDate || undefined,
  });

  const groundNameById = new Map(jrGrounds.map((g) => [g.id, g.plainName] as const));

  function downloadHandoff() {
    const text = buildHandoff({
      triage: { entry, isFallback: entry.isFallback, jurisdiction, avenue: av },
      decisionAbout: entry.title,
      decisionDate: decisionDate || undefined,
      reasonsRequested: false,
      relatedGrounds: relatedGrounds.map((id) => groundNameById.get(id) ?? id),
    });
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "matter-summary.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyTemplate() {
    try {
      await navigator.clipboard.writeText(template);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — the user can still select the text */
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow text-red-ink">{t("resultEyebrow")}</p>
        <h1 className="mt-2 font-display text-[30px] font-black leading-[1.05] text-ink sm:text-[38px]">{entry.title}</h1>
      </div>
      <Disclaimer />

      {/* Urgent, but NOT a dead end. Timing flags (deadline soon/passed, hearing booked)
          used to stop the flow entirely, which left the people in the biggest hurry with
          nothing to act on. Now we lead with "call today" and still show every option
          below — amber, because on this product time pressure is never red. */}
      {trip.urgent && (
        <section
          className="sticker rounded-card border-2 border-amber-border bg-amber-bg p-5 sm:p-6"
          style={{ "--rot": "-0.6deg" } as React.CSSProperties}
        >
          <div className="flex items-start gap-3.5">
            <span aria-hidden="true" className="mt-0.5 text-[20px] leading-none text-amber-ink">◔</span>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-[21px] font-black leading-tight text-ink">
                {t("urgentTitle")}
              </h2>
              <ul className="mt-2.5 space-y-2 text-[15.5px] leading-snug text-ink-soft">
                {trip.urgentReasons.map((r) => (
                  <li key={r} className="flex gap-2.5">
                    <span aria-hidden="true" className="mt-[9px] h-1.5 w-1.5 flex-none rounded-[2px] bg-amber-border" />
                    <span>{TRIPWIRE_MESSAGES[r]}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2.5 text-[15.5px] leading-snug text-ink-soft">{t("urgentBody")}</p>
              <Link href="/help" className="btn btn-help mt-4">
                {t("helpMore")} <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* The album's empty-slot device: this decision has no pathway of its own yet. Dashed,
          never shadowed — it is a gap on the page, not a sticker. Never used for a deadline. */}
      {entry.isFallback && (
        <p
          className="slot-empty px-5 py-4 text-[15px] leading-relaxed text-ink-soft"
          style={{ transform: "rotate(1.1deg)" }}
        >
          {t("fallbackNote")}
        </p>
      )}

      {/* Who can review this */}
      <section data-tour="avenue" className="card">
        <h2 className="font-display text-[21px] font-black text-ink">{t("avenueTitle")}</h2>
        <ul className="mt-4 space-y-3">
          {av.mrAvailable && (
            <li className="rounded-sticker bg-cream px-4 py-3">
              <p className="font-display text-[17px] font-extrabold text-ink">
                {t("avenueMR")}{" "}
                <span className="font-sans text-[15.5px] font-normal text-ink-soft">
                  {t("via", { body: av.mrBody })}
                </span>
              </p>
              <p className="mt-1 text-[15.5px] leading-snug text-ink-soft">{t("avenueMRWhat")}</p>
            </li>
          )}
          {av.jrAvailable && (
            <li className="rounded-sticker bg-cream px-4 py-3">
              <p className="font-display text-[17px] font-extrabold text-ink">
                {t("avenueJR")}{" "}
                <span className="font-sans text-[15.5px] font-normal text-ink-soft">
                  {t("via", { body: av.jrForum })}
                </span>
              </p>
              <p className="mt-1 text-[15.5px] leading-snug text-ink-soft">{t("avenueJRWhat")}</p>
            </li>
          )}
          {!av.mrAvailable && !av.jrAvailable && (
            <li className="rounded-sticker bg-cream px-4 py-3 text-[15.5px] text-ink-soft">{t("noReview")}</li>
          )}
          {av.noReviewEndpoint && (
            <li className="rounded-sticker bg-cream px-4 py-3 text-[15.5px] text-ink-soft">{av.noReviewEndpoint}</li>
          )}
        </ul>
        {/* Time limits — amber and calm, a quiet line inside the analysis. Never red, never a
            countdown, never a headline: the rule plus its source, nothing that ticks. */}
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
      </section>

      {/* Understand these options — in-flow Learn (progressive disclosure) */}
      {(av.mrAvailable || av.jrAvailable) && (
        <section className="card">
          <h2 className="font-display text-[21px] font-black text-ink">{t("learnTitle")}</h2>
          <p className="mt-2 text-[15.5px] leading-relaxed text-ink-soft">{t("learnLead")}</p>
          <div className="mt-4 space-y-3">
            {av.mrAvailable && (
              <details className="rounded-sticker border-2 border-line bg-cream px-4 py-3">
                <summary className="cursor-pointer py-2.5 font-display text-[17px] font-extrabold text-ink">
                  {meritsReview.name} — {meritsReview.plainName}
                </summary>
                <div className="mt-4">
                  <ProcessExplainer process={meritsReview} compact />
                </div>
              </details>
            )}
            {av.jrAvailable && (
              <details className="rounded-sticker border-2 border-line bg-cream px-4 py-3">
                <summary className="cursor-pointer py-2.5 font-display text-[17px] font-extrabold text-ink">
                  {judicialReview.name} — {judicialReview.plainName}
                </summary>
                <div className="mt-4">
                  <ProcessExplainer process={judicialReview} compact />
                </div>
              </details>
            )}
          </div>
          <Link href="/learn" className="link-text mt-5 inline-flex min-h-[44px]">
            {t("learnMore")}
          </Link>
        </section>
      )}

      {/* Ask for the reasons */}
      <section data-tour="reasons" className="card">
        <h2 className="font-display text-[21px] font-black text-ink">{t("reasonsTitle")}</h2>
        <p className="mt-2 text-[15.5px] leading-relaxed text-ink-soft">{t("reasonsLead")}</p>
        {/* Anything about the clock is amber and calm — same rule as the time-limit line. */}
        <div className="mt-4 rounded-sticker border-2 border-amber-border bg-amber-bg px-4 py-3">
          <p className="font-display text-[13px] font-black uppercase tracking-[0.1em] text-amber-ink">
            {t("reasonsClockTitle")}
          </p>
          <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-soft">{REASONS_CLOCK_WARNING}</p>
        </div>
        <textarea
          readOnly
          value={template}
          rows={12}
          className="input mt-4 font-mono text-[14.5px] leading-relaxed"
          aria-label={t("reasonsTitle")}
        />
        <button type="button" onClick={copyTemplate} className="btn btn-secondary mt-4">
          {copied ? t("reasonsCopied") : t("reasonsCopy")}
        </button>
      </section>

      {/* Grounds people raise — in-flow, neutral; selection flows into the hand-off */}
      {av.jrAvailable && jrGrounds.length > 0 && (
        <section data-tour="grounds" className="card">
          <h2 className="font-display text-[21px] font-black text-ink">{t("groundsTitle")}</h2>
          <p className="mt-2 text-[15.5px] leading-relaxed text-ink-soft">{t("groundsLead")}</p>
          <div className="mt-5">
            <GroundsExplorer
              grounds={jrGrounds}
              selectable
              selected={relatedGrounds}
              onToggle={onToggleGround}
              linkBase="/learn/grounds"
            />
          </div>
          <Link href="/learn/grounds" className="link-text mt-5 inline-flex min-h-[44px]">
            {t("groundsMore")}
          </Link>
        </section>
      )}

      {/* Hand-off + help */}
      {/* The one foil on this screen (max one per page): the recommended next action is to
          take the summary to a free service. */}
      <section
        data-tour="handoff"
        className="foil sticker"
        style={{ "--rot": "0.8deg" } as React.CSSProperties}
      >
        <div className="foil-inner">
          <h2 className="font-display text-[21px] font-black text-ink">{t("handoffTitle")}</h2>
          <p className="mt-2 text-[15.5px] leading-relaxed text-ink-soft">{t("handoffLead")}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" onClick={downloadHandoff} className="btn btn-help">
              {t("handoffDownload")}
            </button>
            <button type="button" onClick={() => window.print()} className="btn btn-secondary">
              {t("handoffPrint")}
            </button>
          </div>
        </div>
      </section>

      <HelpList t={t} entry={entry} />
    </div>
  );
}

function HelpList({ t, entry }: { t: ReturnType<typeof useTranslations>; entry: DataPathway }) {
  return (
    <section
      className="sticker rounded-card border-2 border-help bg-help-soft p-5 sm:p-6"
      style={{ "--rot": "-0.7deg" } as React.CSSProperties}
    >
      <h2 className="font-display text-[21px] font-black text-help-ink">{t("helpTitle")}</h2>
      <ul className="mt-4 space-y-2.5">
        {entry.getHelp.map((h) => (
          <li key={h.service}>
            <a
              href={h.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center font-display text-[16px] font-extrabold text-help-ink underline underline-offset-[3px] hover:text-ink"
            >
              {h.service}
            </a>
          </li>
        ))}
      </ul>
      <Link
        href="/help"
        className="mt-4 inline-flex min-h-[44px] items-center gap-1.5 font-display text-[13px] font-extrabold uppercase tracking-[0.08em] text-help-ink hover:text-ink"
      >
        {t("helpMore")} →
      </Link>
    </section>
  );
}
