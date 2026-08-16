"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { listDataEntries, getDataEntry } from "@/lib/data";
import type { DataPathway, Jurisdiction } from "@/lib/schemas/data";
import type { Process, Ground } from "@/lib/schemas/legal";
import { avenueView } from "@/lib/triage";
import { planFor, midSentence, type PathPlan } from "@/lib/analysis";
import { deadlineRuleView } from "@/lib/deadline/rule";
import { reasonsRequestTemplate, REASONS_CLOCK_WARNING } from "@/lib/reasons";
import { buildDraft, type DraftKind } from "@/lib/draft/build";
import type { PathwayEntry } from "@/lib/schemas/corpus";
import { checkTripwire, servicesForStop, TRIPWIRE_MESSAGES, type TripwireFlags } from "@/lib/tripwire";
import { buildHandoff } from "@/lib/handoff";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { AutoTextarea } from "@/components/ui/AutoTextarea";
import { GetHelp } from "@/components/ui/GetHelp";
import { CallButton } from "@/components/ui/CallButton";
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

export interface FaqLink {
  slug: string;
  question: string;
}

export function RightsSaverClient({
  meritsReview,
  judicialReview,
  jrGrounds,
  faqsByEntry = {},
  corpusByEntry = {},
}: {
  meritsReview: Process;
  judicialReview: Process;
  jrGrounds: Ground[];
  /** Published FAQ articles keyed by the decision type they were written for. */
  faqsByEntry?: Record<string, FaqLink[]>;
  /** Decode-corpus entries keyed by id, so application drafts can be built on-device. */
  corpusByEntry?: Record<string, PathwayEntry>;
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
    // Restore to the result when the URL says we were there, otherwise to the area step.
    if (area && getDataEntry(area)) setStep(p.get("step") === "result" ? "result" : "what");
  }, []);

  // Mirror the answers into the URL as the person moves.
  //
  // The result links out to guides, FAQ articles and the help directory, all in this tab.
  // Without this, Back re-mounted the flow at step 1 and silently threw away everything —
  // including the decision date they had to dig out of the letter, and every ground they
  // ticked. Nothing is stored server-side and nothing sensitive goes in the URL: it is the
  // same three answers the deep link already accepted.
  useEffect(() => {
    if (step === "who") return;
    const p = new URLSearchParams();
    if (jurisdiction) p.set("jur", jurisdiction);
    if (areaId) p.set("area", areaId);
    if (decisionDate) p.set("date", decisionDate);
    if (step === "result") p.set("step", "result");
    window.history.replaceState(null, "", `${window.location.pathname}?${p.toString()}`);
  }, [step, jurisdiction, areaId, decisionDate]);

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
              faqs={faqsByEntry[entry.id] ?? []}
              corpusEntry={corpusByEntry[entry.id]}
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
        {/* Free help, on every step. The flow hides the site nav and footer, so steps 1
            and 2 previously had no route to a person at all — and those are the screens
            where a frightened reader is most likely to stop. */}
        <Link
          href="/help"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-button border-2 border-help bg-help-soft px-3 font-display text-[12.5px] font-extrabold uppercase tracking-[0.08em] text-help-ink hover:bg-help hover:text-paper"
        >
          <Icon.Phone className="h-4 w-4 shrink-0" strokeWidth={2.2} aria-hidden="true" />
          <span className="hidden sm:inline">{t("headerHelp")}</span>
          <span className="sr-only sm:hidden">{t("headerHelp")}</span>
        </Link>
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
  // The button used to be `disabled` with no explanation, while the thing blocking it (the
  // consent tick) was ~800px back up a long phone page. Keep it live, and when it can't
  // proceed say why and take the person to the control that needs them.
  const [blocked, setBlocked] = useState<null | "area" | "consent">(null);
  const consentRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);

  function attemptContinue() {
    if (!areaId) {
      setBlocked("area");
      areaRef.current?.scrollIntoView({ block: "center" });
      return;
    }
    if (!consent) {
      setBlocked("consent");
      consentRef.current?.scrollIntoView({ block: "center" });
      consentRef.current?.focus();
      return;
    }
    setBlocked(null);
    onContinue();
  }

  return (
    <>
      <h1 className="font-display text-[30px] font-black leading-[1.05] text-ink sm:text-[40px]">{t("whatTitle")}</h1>
      <p className="mt-3 max-w-[560px] text-[17px] text-ink-soft">{t("whatHelp")}</p>

      <div ref={areaRef} data-tour="area-cards" className="mt-7 grid gap-5 sm:grid-cols-2">
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
            ref={consentRef}
            type="checkbox"
            checked={consent}
            onChange={(e) => {
              setConsent(e.target.checked);
              if (e.target.checked) setBlocked(null);
            }}
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
          onClick={attemptContinue}
          aria-disabled={!canContinue}
          className={`btn btn-primary btn-lg sticker px-8 ${canContinue ? "" : "opacity-60"}`}
          style={{ "--rot": "0.8deg" } as React.CSSProperties}
        >
          {t("see")} →
        </button>
      </div>
      {blocked && (
        <p role="status" className="mt-3 text-[15.5px] font-medium text-red-ink">
          {blocked === "area" ? t("blockedArea") : t("blockedConsent")}
        </p>
      )}
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
  faqs,
  corpusEntry,
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
  faqs: FaqLink[];
  corpusEntry?: PathwayEntry;
}) {
  // Hooks first: the tripwire below can return early, and hook order must not change.
  // `null` means "whichever path comes first for this decision" — resolved once we know it.
  const [applyKind, setApplyKind] = useState<DraftKind | null>(null);
  const [applyCopied, setApplyCopied] = useState(false);

  const trip = checkTripwire({ jurisdiction, flags, entry });
  const stopServices = servicesForStop(trip.stopReasons);

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
        {/* Route to the services that match WHY we stopped — a criminal element needs a
            criminal duty lawyer, not the fines office. The decision-area services stay
            below as a secondary list, never the primary answer. */}
        <GetHelp services={stopServices} title={t("routeHelpTitle")} />
        <details className="card">
          <summary className="cursor-pointer py-2 font-display text-[16px] font-extrabold text-ink">
            {t("routeAlsoTitle")}
          </summary>
          <div className="mt-4">
            <HelpList t={t} entry={entry} />
          </div>
        </details>
      </div>
    );
  }

  const av = avenueView(entry);
  const plan = planFor({ avenue: av, meritsReview, judicialReview, jurisdiction });

  // The application letters differ by path: merits review asks a tribunal for the correct
  // or preferable decision on the facts; judicial review is a court process about how the
  // decision was made, so its draft opens with a warning and is framed as something to take
  // to a free service. The person picks which one they mean; nothing is chosen for them.
  const applyKinds = plan.paths.map((pp) => ({
    id: (pp.id === "merits-review"
      ? "merits-review-application"
      : "judicial-review-application") as DraftKind,
    pathId: pp.id,
    label: pp.id === "merits-review" ? t("applyMerits") : t("applyJudicial"),
    hint: pp.id === "merits-review" ? t("applyMeritsHint") : t("applyJudicialHint"),
    href: `/learn/${pp.id}`,
  }));
  const activeApply = applyKinds.find((k) => k.id === applyKind) ?? applyKinds[0];
  const applyDraft =
    corpusEntry && activeApply ? buildDraft(corpusEntry, activeApply.id) : null;

  // What is actually on this page, in the order it appears.
  const contents = [
    { id: "r-analysis", label: t("analysisTitle") },
    ...(av.mrAvailable || av.jrAvailable ? [{ id: "r-learn", label: t("learnTitle") }] : []),
    { id: "r-reasons", label: t("reasonsTitle") },
    ...(applyDraft ? [{ id: "r-apply", label: t("applyTitle") }] : []),
    ...(av.jrAvailable && jrGrounds.length > 0 ? [{ id: "r-grounds", label: t("groundsTitle") }] : []),
    ...(faqs.length > 0 ? [{ id: "r-faq", label: t("faqTitle") }] : []),
    { id: "r-handoff", label: t("handoffTitle") },
  ];
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
      forumNames: {
        merits: plan.paths.find((pp) => pp.id === "merits-review")?.body,
        judicial: plan.paths.find((pp) => pp.id === "judicial-review")?.body,
      },
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

      {/* The result runs long — deliberately, because it is the whole picture. A stressed
          reader on a phone should not have to scroll to find out what is here, so name the
          parts up front and let them jump. Built from what actually rendered, so it never
          points at a section that isn't on the page. */}
      {contents.length > 2 && (
        <nav aria-label={t("contentsTitle")} className="card">
          <h2 className="eyebrow text-ink-faint">{t("contentsTitle")}</h2>
          <ol className="mt-3 grid gap-x-6 gap-y-0 sm:grid-cols-2">
            {contents.map((c, i) => (
              <li key={c.id} className="border-b border-line last:border-b-0 sm:[&:nth-last-child(-n+1)]:border-b-0">
                <a
                  href={`#${c.id}`}
                  className="group flex min-h-[44px] items-center gap-3 py-2.5 text-[15.5px] font-medium text-ink hover:text-red-ink"
                >
                  <span aria-hidden="true" className="mono text-[12px] text-ink-faint">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0">{c.label}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}

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

      {/* ===== The analysis: what this means, and how each path actually works =====
           Everything substantive is corpus-verified (the question each forum decides, what
           it can and cannot do). We order the paths — merits review first where it exists,
           because only a tribunal can substitute a different decision — and describe what
           each forum weighs. We never rate the person's prospects or tell them what to do. */}
      <section id="r-analysis" data-tour="avenue" data-tour-alt="analysis" className="card sticker" style={{ "--rot": "-0.5deg" } as React.CSSProperties}>
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

      {/* Understand these options — in-flow Learn (progressive disclosure) */}
      {(av.mrAvailable || av.jrAvailable) && (
        <section id="r-learn" className="card">
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
      <section id="r-reasons" data-tour="reasons" className="card">
        <h2 className="font-display text-[21px] font-black text-ink">{t("reasonsTitle")}</h2>
        <p className="mt-2 text-[15.5px] leading-relaxed text-ink-soft">{t("reasonsLead")}</p>
        {/* Anything about the clock is amber and calm — same rule as the time-limit line. */}
        <div className="mt-4 rounded-sticker border-2 border-amber-border bg-amber-bg px-4 py-3">
          <p className="font-display text-[13px] font-black uppercase tracking-[0.1em] text-amber-ink">
            {t("reasonsClockTitle")}
          </p>
          <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-soft">{REASONS_CLOCK_WARNING}</p>
        </div>
        <AutoTextarea
          readOnly
          value={template}
          minRows={12}
          className="input mt-4 font-mono text-[14.5px] leading-relaxed"
          aria-label={t("reasonsTitle")}
        />
        <button type="button" onClick={copyTemplate} className="btn btn-secondary mt-4">
          {copied ? t("reasonsCopied") : t("reasonsCopy")}
        </button>
      </section>

      {/* Apply for review — one draft per path, chosen by the person. Built on-device from
          the corpus entry (pure function, no request), so the no-network promise holds. */}
      {applyDraft && activeApply && (
        <section id="r-apply" data-tour="apply" className="card">
          <h2 className="font-display text-[21px] font-black text-ink">{t("applyTitle")}</h2>
          <p className="mt-2 text-[15.5px] leading-relaxed text-ink-soft">{t("applyLead")}</p>

          {applyKinds.length > 1 && (
            <div role="group" aria-label={t("applyTitle")} className="mt-4 flex flex-wrap gap-2.5">
              {applyKinds.map((k) => {
                const on = k.id === applyKind;
                return (
                  <button
                    key={k.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      setApplyKind(k.id);
                      setApplyCopied(false);
                    }}
                    className={`inline-flex min-h-[44px] items-center rounded-pill px-4 font-display text-[13px] font-extrabold uppercase tracking-[0.06em] ${
                      on ? "bg-ink text-cream" : "border-2 border-line text-ink-faint hover:text-ink"
                    }`}
                  >
                    {k.label}
                  </button>
                );
              })}
            </div>
          )}

          <p className="mt-3.5 text-[15px] leading-relaxed text-ink-soft">
            {activeApply.hint}{" "}
            <Link href={activeApply.href} className="link">
              {t("applyReadMore")}
            </Link>
          </p>

          <AutoTextarea
            readOnly
            value={applyDraft.body}
            minRows={12}
            className="input mt-4 font-mono text-[14.5px] leading-relaxed"
            aria-label={activeApply.label}
          />
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(applyDraft.body).then(() => {
                setApplyCopied(true);
                window.setTimeout(() => setApplyCopied(false), 2000);
              });
            }}
            className="btn btn-secondary mt-4"
          >
            {applyCopied ? t("reasonsCopied") : t("reasonsCopy")}
          </button>
        </section>
      )}

      {/* Grounds people raise — in-flow, neutral; selection flows into the hand-off */}
      {av.jrAvailable && jrGrounds.length > 0 && (
        <section id="r-grounds" data-tour="grounds" className="card">
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

      {/* Questions other people asked about THIS decision. Every FAQ article names the
          pathway it was written for, so this is a real join rather than a generic list —
          the guided flow and the answer library finally point at each other. */}
      {faqs.length > 0 && (
        <section id="r-faq" className="card sticker" style={{ "--rot": "0.6deg" } as React.CSSProperties}>
          <h2 className="font-display text-[21px] font-black text-ink">{t("faqTitle")}</h2>
          <p className="mt-2 text-[15.5px] leading-relaxed text-ink-soft">{t("faqLead")}</p>
          <ul className="mt-3.5 border-t border-line">
            {faqs.map((f) => (
              <li key={f.slug} className="border-b border-line">
                <Link
                  href={`/faq/${f.slug}`}
                  className="group flex min-h-[44px] items-center justify-between gap-4 py-3.5"
                >
                  <span className="font-display text-[16px] font-extrabold leading-snug text-ink group-hover:text-red-ink">
                    {f.question}
                  </span>
                  <span aria-hidden="true" className="shrink-0 font-display font-black text-red-ink">→</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/faq" className="link-text mt-4 inline-flex">
            {t("faqMore")} <span aria-hidden="true">→</span>
          </Link>
        </section>
      )}

      {/* Hand-off + help */}
      {/* The one foil on this screen (max one per page): the recommended next action is to
          take the summary to a free service. */}
      <section
        id="r-handoff"
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
            {/* Say what the service is for, and make the number dialable — a bare list of
                organisation names asked the reader to do the research themselves. */}
            {h.who && <p className="text-[14.5px] leading-snug text-help-ink">{h.who}</p>}
            {h.phone && (
              <div className="mt-1.5">
                <CallButton phone={h.phone} label={h.service} />
              </div>
            )}
          </li>
        ))}
      </ul>
      <Link
        href={`/help?jur=${entry.jurisdiction}`}
        className="mt-4 inline-flex min-h-[44px] items-center gap-1.5 font-display text-[13px] font-extrabold uppercase tracking-[0.08em] text-help-ink hover:text-ink"
      >
        {t("helpMore")} →
      </Link>
    </section>
  );
}
