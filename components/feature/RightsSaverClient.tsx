"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { listDataEntries, getDataEntry } from "@/lib/data";
import type { DataPathway, Jurisdiction } from "@/lib/schemas/data";
import { groundAppliesIn, type Process, type Ground } from "@/lib/schemas/legal";
import { avenueView } from "@/lib/triage";
import { planFor } from "@/lib/analysis";
import { AnalysisPanel } from "@/components/feature/AnalysisPanel";
import { deadlineRuleView } from "@/lib/deadline/rule";
import { reasonsRequestTemplate, REASONS_CLOCK_WARNING } from "@/lib/reasons";
import { type DraftKind } from "@/lib/draft/build";
import { composeLetter, LETTER_GROUND_HEADINGS, LAWYER_NOTE_ONLY } from "@/lib/letter/compose";
import type { PathwayEntry } from "@/lib/schemas/corpus";
import {
  checkTripwire,
  servicesForStop,
  capabilitiesForStop,
  TRIPWIRE_MESSAGE_KEYS,
  type TripwireFlags,
} from "@/lib/tripwire";
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
  { key: "criminal", label: "flagCriminal", hint: "flagCriminalHint" },
  { key: "detention", label: "flagDetention", hint: "flagDetentionHint" },
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
  const tLetter = useTranslations("letter");
  const allEntries = useMemo(() => listDataEntries(), []);

  const [step, setStep] = useState<Step>("who");
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction | null>(null);
  const [areaId, setAreaId] = useState<string | null>(null);
  const [decisionDate, setDecisionDate] = useState("");
  const [flags, setFlags] = useState<TripwireFlags>({});
  const [consent, setConsent] = useState(false);
  const [copied, setCopied] = useState(false);
  const lastStepRef = useRef<Step | null>(null);
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
    // Land on the QUESTIONS, never straight on the result — even when the URL says
    // "step=result". At this point `flags` is empty and `consent` is false, so restoring
    // to the result rendered the whole builder with the tripwire never asked and the
    // "not legal advice" consent box never ticked. A bookmark, a shared link, a chat
    // hand-off or the Back button was enough to bypass both. We still WRITE step=result
    // so Back works inside a session; we just never trust it on the way in.
    if (area && getDataEntry(area)) setStep("what");
  }, []);

  // Mirror the answers into the URL, and give the browser real history to walk.
  //
  // This used `replaceState`, which overwrites the current entry instead of adding one — so
  // the Back button never saw the steps and dropped the person straight out of the flow.
  // Now each forward move PUSHES an entry and `popstate` restores the step, so Back and
  // Forward behave the way every other website has taught people to expect.
  //
  // The consent gate still holds: `step=result` is only ever restored when consent was
  // given IN THIS SESSION. A fresh load, a bookmark or a shared link starts at the
  // questions, because `consent` is false until the person ticks the box.
  const poppingRef = useRef(false);
  useEffect(() => {
    // Runs for EVERY step including "who". Skipping it left lastStepRef null on the first
    // move, so who -> what replaced the entry instead of pushing one, and there was no step 1
    // to go back to.
    const p = new URLSearchParams();
    if (jurisdiction) p.set("jur", jurisdiction);
    if (areaId) p.set("area", areaId);
    if (decisionDate) p.set("date", decisionDate);
    p.set("step", step);
    const qs = p.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    // A step reached by pressing Back must NOT push a new entry — that re-pushes the entry
    // the browser just left and pins the person on one step however often they press Back.
    if (poppingRef.current) {
      poppingRef.current = false;
      lastStepRef.current = step;
      return;
    }
    // Push once per step change; refine the same entry when only the answers change.
    if (lastStepRef.current !== null && lastStepRef.current !== step) {
      window.history.pushState({ step }, "", url);
    } else {
      window.history.replaceState({ step }, "", url);
    }
    lastStepRef.current = step;
  }, [step, jurisdiction, areaId, decisionDate]);

  useEffect(() => {
    function onPop() {
      poppingRef.current = true;
      // Restore from the URL, not from React state: the handler's closure can hold a stale
      // value, and the URL is the thing the browser actually navigated to.
      const p = new URLSearchParams(window.location.search);
      const jur = p.get("jur");
      const area = p.get("area");
      const date = p.get("date");
      const want = p.get("step");
      if (jur === "Vic" || jur === "Cth") setJurisdiction(jur);
      if (area && getDataEntry(area)) setAreaId(area);
      if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) setDecisionDate(date);
      if (want === "result") {
        // Never let Back or Forward walk INTO a result that was never consented to.
        setStep(consent && area ? "result" : "what");
      } else if (want === "what" && (jur || jurisdiction)) {
        setStep("what");
      } else {
        setStep("who");
      }
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [consent, areaId, jurisdiction]);

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
              tLetter={tLetter}
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

      {/* What we cannot cover, BEFORE the person starts choosing. It existed only as
          checkbox labels further down the page, which is too late to save anyone a wasted
          journey. */}
      <p className="mt-4 max-w-[560px] rounded-sticker border-2 border-line bg-cream px-4 py-3 text-[15px] leading-relaxed text-ink-soft">
        {t("outOfScope")}
      </p>

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
              <span className="min-w-0 flex-1">
                <span className="block font-display text-[16.5px] font-extrabold leading-snug text-ink">
                  {e.title}
                </span>
                {/* Name the situations this guide covers, so people recognise their own
                    instead of guessing at a category. Inside the button on purpose: a
                    screen-reader user needs the same cue a sighted user gets. */}
                {e.examples.length > 0 && (
                  <span className="mt-1 block text-[14px] leading-snug text-ink-faint">
                    {t("tileExamplesList", { list: e.examples.slice(0, 4).join(" · ") })}
                  </span>
                )}
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
  tLetter,
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
  tLetter: ReturnType<typeof useTranslations>;
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
  // Grounds are scoped to where the person actually is. Every common-law ground is unscoped
  // and survives; the Victorian Charter ground does not reach a Commonwealth decision, and
  // offering it there would send someone looking for a protection they do not have.
  const shownGrounds = useMemo(
    () => jrGrounds.filter((g) => groundAppliesIn(g, jurisdiction)),
    [jrGrounds, jurisdiction],
  );
  // `null` means "whichever path comes first for this decision" — resolved once we know it.
  const [applyKind, setApplyKind] = useState<DraftKind | null>(null);
  const [applyCopied, setApplyCopied] = useState(false);
  // What the person types about their own situation. Held in component state only: it is
  // never written to storage, never put in the URL, and never sent anywhere. It exists to be
  // composed into a letter they then send themselves.
  const [account, setAccount] = useState<Record<string, string>>({});
  // Lines the model selected FROM the person's own words, and which of them they have ticked.
  // Only ticked lines reach the letter, so nothing is ever sent that they have not read.
  const [picked, setPicked] = useState<
    { groundId: string; sentences: { text: string; sensitive: string[] }[] }[] | null
  >(null);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [letterBusy, setLetterBusy] = useState(false);
  const [letterMsg, setLetterMsg] = useState<string | null>(null);

  const trip = checkTripwire({ jurisdiction, flags, entry });
  const stopServices = servicesForStop(trip.stopReasons);
  const caps = capabilitiesForStop(trip.stopReasons);

  /**
   * A note to take to the service. It records WHAT THE PERSON TICKED, in the words they
   * were shown — not our explanation of why we stopped, which would read in a lawyer's
   * hands as the person's own account of their matter. Built and saved on the device.
   */
  function downloadStopNotes() {
    const ticked = FLAG_KEYS.filter((f) => flags[f.key]).map((f) => `- ${t(f.label)}`);
    const text = [
      t("stopNotesHeading"),
      t("stopNotesAttribution"),
      "",
      `${t("stopNotesArea")}: ${entry.title}`,
      `${t("stopNotesDate")}: ${decisionDate || t("stopNotesBlank")}`,
      "",
      `${t("stopNotesTicked")}:`,
      ...(ticked.length ? ticked : [`- ${t("stopNotesBlank")}`]),
      "",
      `${t("stopPrepTitle")}:`,
      ...[1, 2, 3, 4, 5, 6].map((n) => `- ${t(`stopPrep${n}`)}`),
      "",
      `${t("stopAskTitle")}:`,
      ...[1, 2, 3, 4, 5].map((n) => `- ${t(`stopAsk${n}`)}`),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = t("stopNotesFile");
    a.click();
    URL.revokeObjectURL(url);
  }

  // --- Tripwire: stop and route to a person (no builder output) ---
  // The tripwire no longer STOPS the flow.
  //
  // It used to return a hand-over screen instead of the result, so ticking any box under
  // "Does any of these apply?" replaced the whole analysis with "talk to a free legal
  // service". That is backwards: the person chose a decision type, and the analysis is about
  // THAT decision type — their circumstances are extra context, not a reason to withhold
  // everything. So the hand-over now leads, prominently and with a phone number, and the
  // full analysis and pathway follow it. Nothing is hidden.

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
  // ONE box. Five labelled questions read as a form to fill in, and a frightened person on a
  // phone abandons forms; they will tell the story once, in their own order, if asked once.
  // The prompts that were the question labels become hints under the box, so nothing is lost.
  const universalQs = [{ id: "q-story", label: t("accountQStory") }];

  const applyDraft =
    corpusEntry && activeApply
      ? composeLetter({
          entry: corpusEntry,
          kind: activeApply.id,
          account: {
            answers: {
              ...account,
              // Ticked lines become the text under each heading. Untouched if they never
              // pressed the button, so the deterministic letter is unchanged.
              ...Object.fromEntries(
                (picked ?? []).map((p) => [
                  `g-${p.groundId}`,
                  p.sentences
                    .filter((x) => chosen.has(`${p.groundId}::${x.text}`))
                    .map((x) => x.text)
                    .join(" "),
                ]),
              ),
            },
            groundIds: relatedGrounds,
          },
          headingFor: (k) => tLetter(k),
          groundsLead: tLetter("groundsLead"),
          otherConcerns: tLetter("otherConcerns"),
          universal: universalQs,
        })
      : null;

  // What is actually on this page, in the order it appears.
  const contents = [
    { id: "r-analysis", label: t("analysisTitle") },
    ...(av.mrAvailable || av.jrAvailable ? [{ id: "r-learn", label: t("learnTitle") }] : []),
    { id: "r-reasons", label: t("reasonsTitle") },
    ...((av.mrAvailable || av.jrAvailable) && shownGrounds.length > 0
      ? [{ id: "r-grounds", label: t("groundsTitle") }]
      : []),
    ...(relatedGrounds.length > 0 || applyDraft ? [{ id: "r-account", label: t("accountTitle") }] : []),
    ...(applyDraft ? [{ id: "r-apply", label: t("applyTitle") }] : []),
    ...(faqs.length > 0 ? [{ id: "r-faq", label: t("faqTitle") }] : []),
    { id: "r-handoff", label: t("handoffTitle") },
  ];
  const dl = deadlineRuleView(entry);
  const template = reasonsRequestTemplate(entry, {
    about: entry.title.toLowerCase(),
    decisionDate: decisionDate || undefined,
  });

  const groundNameById = new Map(shownGrounds.map((g) => [g.id, g.plainName] as const));

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

      {/* Leads when a flag was ticked; the analysis below is unchanged. */}
      {trip.stop && (
        <div className="space-y-6">

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
                {/* The number, first. This is the highest-stakes screen in the product: the
                    route to a human must be the first thing a thumb can reach, not two
                    screens down. */}
                {stopServices[0]?.phone && (
                  <div className="mt-4">
                    <CallButton phone={stopServices[0].phone} label={stopServices[0].service} />
                    <p className="mt-1.5 text-[14px] leading-snug text-help-ink">
                      {stopServices[0].service}
                    </p>
                  </div>
                )}
                {caps.urgentPerson && (
                  <p className="mt-3 text-[15.5px] font-medium leading-snug text-help-ink">
                    {t("stopCallNowNote")}
                  </p>
                )}
              </div>
            </div>
            <ul className="mt-4 space-y-2 text-[15.5px] leading-snug text-help-ink">
              {/* The reasons we STOPPED. Mapping every reason put "your options below will
                  help you explain the matter quickly" on a screen that has no options. */}
              {trip.stopReasons.map((r) => (
                <li key={r} className="flex gap-2.5">
                  <span aria-hidden="true" className="mt-[9px] h-1.5 w-1.5 flex-none rounded-[2px] bg-help" />
                  <span>{t(TRIPWIRE_MESSAGE_KEYS[r])}</span>
                </li>
              ))}
            </ul>
          </div>
          {/* Route to the services that match WHY we stopped — a criminal element needs a
              criminal duty lawyer, not the fines office. The decision-area services stay
              below as a secondary list, never the primary answer. */}
          <GetHelp services={stopServices} title={t("routeHelpTitle")} />
          {/* The value we CAN add when we cannot analyse the matter.
              None of this asserts a legal proposition, names a forum, or states a time limit
              — it is about making the appointment count. That is why it is safe for every
              stop reason, including the most serious. */}
          <section className="card">
            <p className="text-[16px] font-medium leading-relaxed text-ink">{t("stopStillHelpful")}</p>

            <h2 className="mt-5 font-display text-[21px] font-black text-ink">{t("stopPrepTitle")}</h2>
            <p className="mt-1.5 text-[15.5px] leading-relaxed text-ink-soft">{t("stopPrepLead")}</p>
            <ul className="mt-3.5 space-y-2.5">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <li key={n} className="flex gap-2.5 text-[15.5px] leading-snug text-ink">
                  <span aria-hidden="true" className="mt-[9px] h-1.5 w-1.5 flex-none rounded-[2px] bg-ink" />
                  <span>{t(`stopPrep${n}`)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{t("stopPrepNote")}</p>

            <h2 className="mt-7 font-display text-[21px] font-black text-ink">{t("stopAskTitle")}</h2>
            <p className="mt-1.5 text-[15.5px] leading-relaxed text-ink-soft">{t("stopAskLead")}</p>
            <ul className="mt-3.5 space-y-2.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <li key={n} className="flex gap-2.5 text-[15.5px] leading-snug text-ink">
                  <span aria-hidden="true" className="mt-[3px] flex-none font-display font-black text-red-ink">?</span>
                  <span>{t(`stopAsk${n}`)}</span>
                </li>
              ))}
            </ul>

            <h2 className="mt-7 font-display text-[21px] font-black text-ink">{t("stopNotesTitle")}</h2>
            <p className="mt-1.5 text-[15.5px] leading-relaxed text-ink-soft">{t("stopNotesLead")}</p>
            <button type="button" onClick={downloadStopNotes} className="btn btn-secondary mt-4">
              {t("stopNotesDownload")}
            </button>
          </section>

          <details className="card">
            <summary className="cursor-pointer py-2 font-display text-[16px] font-extrabold text-ink">
              {t("routeAlsoTitle")}
            </summary>
            <div className="mt-4">
              <HelpList t={t} entry={entry} />
            </div>
          </details>

        </div>
      )}

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
                    <span>{t(TRIPWIRE_MESSAGE_KEYS[r])}</span>
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
      <AnalysisPanel
        plan={plan}
        avenue={av}
        meritsReview={meritsReview}
        judicialReview={judicialReview}
        deadline={dl}
        tour
      />

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

      {/* Grounds people raise — in-flow, neutral; selection flows into the hand-off */}
      {(av.mrAvailable || av.jrAvailable) && shownGrounds.length > 0 && (
        <section id="r-grounds" data-tour="grounds" className="card">
          <h2 className="font-display text-[21px] font-black text-ink">{t("groundsTitle")}</h2>
          <p className="mt-2 text-[15.5px] leading-relaxed text-ink-soft">{t("groundsLead")}</p>
          <div className="mt-5">
            <GroundsExplorer
              grounds={shownGrounds}
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

      {/* Tell us what happened — one box, in their own words.
          The grounds they ticked above are the lead indicator: they decide which headings the
          letter is organised under. This text never leaves the device until they press the
          button below it. */}
      {applyDraft && (
        <section id="r-account" className="card">
          <h2 className="font-display text-[21px] font-black text-ink">{t("accountTitle")}</h2>
          <p className="mt-2 text-[15.5px] leading-relaxed text-ink-soft">{t("accountLead")}</p>

          {/* The admissions guard. Someone writing freely about a Centrelink debt can put
              something in a letter that counts against them, and nothing else warns them. */}
          <p className="mt-4 rounded-sticker border-2 border-amber-border bg-amber-bg px-4 py-3 text-[15px] leading-relaxed text-ink-soft">
            {t("accountAdmitWarn")}
          </p>

          <label className="mt-5 block">
            <span className="mb-1.5 block font-display text-[15.5px] font-extrabold text-ink">
              {t("accountQStory")}
            </span>
            <span className="mb-2 block text-[14.5px] leading-snug text-ink-faint">
              {t("accountHint")}
            </span>
            <textarea
              value={account["q-story"] ?? ""}
              onChange={(e) => setAccount((a) => ({ ...a, "q-story": e.target.value }))}
              rows={10}
              className="input leading-relaxed"
              placeholder={t("accountPlaceholder")}
            />
          </label>

          {/* What they marked, and what it will do. Ticking a ground had no visible effect
              before — this is the connection between the two. */}
          {relatedGrounds.length > 0 && (
            <div className="mt-5 rounded-sticker border-2 border-line bg-cream px-4 py-3.5">
              <p className="font-display text-[13px] font-black uppercase tracking-[0.1em] text-ink-faint">
                {t("accountMarkedTitle")}
              </p>
              <ul className="mt-2 space-y-1.5">
                {relatedGrounds.map((id) => {
                  const g = shownGrounds.find((x) => x.id === id);
                  if (!g) return null;
                  const inLetter = Boolean(LETTER_GROUND_HEADINGS[id]) && !LAWYER_NOTE_ONLY.has(id);
                  return (
                    <li key={id} className="flex gap-2.5 text-[15px] leading-snug text-ink">
                      <span aria-hidden="true" className="mt-[8px] h-1.5 w-1.5 flex-none rounded-[2px] bg-red" />
                      <span>
                        {g.plainName}
                        {!inLetter && (
                          <span className="block text-[14px] text-ink-faint">
                            {t("accountGroundNoteLawyer")}
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* The one action on /start that sends anything. Labelled so, next to the button,
              because every other word on this page promises the opposite. */}
          <div className="mt-6 border-t-2 border-line pt-5">
            <p className="text-[15px] leading-relaxed text-ink-soft">{t("letterSendNote")}</p>
            <button
              type="button"
              disabled={letterBusy || (account["q-story"] ?? "").trim().length < 20}
              onClick={async () => {
                setLetterBusy(true);
                setLetterMsg(null);
                try {
                  const res = await fetch("/api/letter", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    cache: "no-store",
                    body: JSON.stringify({
                      entryId: entry.id,
                      account: account["q-story"] ?? "",
                      groundIds: relatedGrounds,
                    }),
                  });
                  const data = await res.json();
                  if (data.status === "ready") {
                    setPicked(data.points);
                    setChosen(new Set());
                  } else if (data.status === "third-party") setLetterMsg(t("letterThirdParty"));
                  else if (data.status === "nothing-usable") setLetterMsg(t("letterNothing"));
                  else setLetterMsg(t("letterUnavailable"));
                } catch {
                  setLetterMsg(t("letterUnavailable"));
                } finally {
                  setLetterBusy(false);
                }
              }}
              className="btn btn-primary mt-3.5 disabled:opacity-60"
            >
              {letterBusy ? t("letterBusy") : picked ? t("letterBtnAgain") : t("letterBtn")}
            </button>
            {letterMsg && (
              <p role="status" className="mt-3 text-[15.5px] leading-relaxed text-ink">
                {letterMsg}
              </p>
            )}
          </div>

          {/* Nothing reaches the letter until the person ticks it. This is where they attest:
              no gate can tell a fact they lived from a fact they would like, so only they can. */}
          {picked && picked.length > 0 && (
            <div className="mt-6 rounded-card border-2 border-ink bg-paper p-4 sm:p-5">
              <h3 className="font-display text-[19px] font-black text-ink">{t("letterPickTitle")}</h3>
              <p className="mt-1.5 text-[15.5px] leading-relaxed text-ink-soft">{t("letterPickLead")}</p>
              <p className="mt-2 text-[15px] font-medium leading-relaxed text-red-ink">
                {t("letterCheckTrue")}
              </p>
              <div className="mt-4 space-y-5">
                {picked.map((pt) => {
                  const g = jrGrounds.find((x) => x.id === pt.groundId);
                  return (
                    <div key={pt.groundId}>
                      <p className="font-display text-[13px] font-black uppercase tracking-[0.1em] text-ink-faint">
                        {g?.plainName ?? pt.groundId}
                      </p>
                      <ul className="mt-2 space-y-2.5">
                        {pt.sentences.map((sen) => {
                          const key = `${pt.groundId}::${sen.text}`;
                          return (
                            <li key={key}>
                              <label className="flex min-h-[44px] items-start gap-3 text-[15.5px] leading-snug text-ink">
                                <input
                                  type="checkbox"
                                  checked={chosen.has(key)}
                                  onChange={(e) =>
                                    setChosen((prev) => {
                                      const next = new Set(prev);
                                      if (e.target.checked) next.add(key);
                                      else next.delete(key);
                                      return next;
                                    })
                                  }
                                  className="mt-1 h-5 w-5 shrink-0 accent-ink"
                                />
                                <span>
                                  {sen.text}
                                  {sen.sensitive.length > 0 && (
                                    <span className="mt-1 block text-[14.5px] leading-snug text-amber-ink">
                                      {t("letterSensitive")}
                                    </span>
                                  )}
                                </span>
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

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
