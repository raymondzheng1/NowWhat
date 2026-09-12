"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { listDataEntries, getDataEntry, getDataIndex } from "@/lib/data";
import type { DataPathway, Jurisdiction } from "@/lib/schemas/data";
import { groundAppliesIn, type Process, type Ground, type Concept } from "@/lib/schemas/legal";
import { avenueView } from "@/lib/triage";
import { planFor, midSentence } from "@/lib/analysis";
import { AnalysisPanel } from "@/components/feature/AnalysisPanel";
import { deadlineRuleView } from "@/lib/deadline/rule";
import { siteUrl } from "@/lib/config";
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
import { composeMemo } from "@/lib/memo/compose";
import type { PathId } from "@/lib/analysis";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { MemoView } from "@/components/feature/MemoView";
import { LetterView, LetterPlaceholderKey } from "@/components/feature/LetterView";
import { GetHelp } from "@/components/ui/GetHelp";
import { CallButton } from "@/components/ui/CallButton";
import { PrivacyNote } from "@/components/ui/PrivacyNote";
import { useTour } from "@/components/feature/tour/useTour";
import { TOUR_START_WHO, TOUR_START_WHAT, TOUR_START_RESULT } from "@/lib/tour/steps";
import { Crest } from "@/components/ui/Wordmark";
import { Icon, type IconName } from "@/components/ui/icons";
import { ProcessExplainer } from "@/components/feature/learn/ProcessExplainer";
import { GroundsExplorer } from "@/components/feature/learn/GroundsExplorer";

/**
 * Did this browsing session already tick the "not legal advice" box?
 *
 * The consent gate deliberately refuses to restore the result on a fresh load, so a bookmark,
 * a shared link or a chat hand-off can never skip it. But following a link out to /learn and
 * pressing Back IS a fresh load, which dropped people who had already consented back to the
 * questions and lost their place — the single most annoying thing in the flow.
 *
 * A per-tab flag separates the two cases. Same tab, same session, already consented: restore.
 * Anyone else opening the same URL has no flag and still lands on the questions. It holds one
 * boolean, never an answer, and dies with the tab.
 */
const CONSENT_KEY = "wn-consented";

/**
 * The in-flow answers, held per tab so Back returns someone to where they were.
 *
 * SessionStorage, never localStorage: this is the person's own account of what happened to
 * them, and on a shared or library computer it must not outlive the tab. Written only once
 * the consent flag for this tab exists, cleared by "Start over", and never sent anywhere —
 * the flow still computes everything on the device.
 */
const FLOW_KEY = "wn-flow";
interface FlowState {
  chosenPath: PathId | null;
  goals: GoalId[];
  goalOther: string;
  account: Record<string, string>;
  relatedGrounds: string[];
  groundNotes: Record<string, string>;
  criteriaNotes: Record<string, string>;
  pickedCriteria: string[];
}
function forgetFlow(): void {
  try {
    window.sessionStorage.removeItem(FLOW_KEY);
  } catch {
    /* nothing to clear */
  }
}
function sessionConsented(): boolean {
  try {
    return window.sessionStorage.getItem(CONSENT_KEY) === "1";
  } catch {
    return false; // private mode, storage disabled — fall back to asking again
  }
}
function rememberConsent(on: boolean): void {
  try {
    if (on) window.sessionStorage.setItem(CONSENT_KEY, "1");
    else window.sessionStorage.removeItem(CONSENT_KEY);
  } catch {
    /* storage unavailable — the gate simply asks again, which is the safe direction */
  }
}

type Step = "who" | "what" | "result";

/**
 * The result used to be one very long page: analysis, reasons, grounds, a free-text box, a
 * draft and a hand-off, all stacked. People told us it was overwhelming, and the order was
 * wrong — it asked for their story two thirds of the way down, after showing them options
 * chosen without it.
 *
 * It is now four steps, in the order a person actually thinks:
 *   story   what happened, in their words
 *   goal    what they are hoping for
 *   options every route open to them, ordered by that answer
 *   path    the analysis and the memo for the route they pick
 *
 * Each pushes a history entry, so Back walks the steps instead of leaving the flow.
 */
type ResultView = "story" | "goal" | "options" | "grounds" | "memo" | "help";

/**
 * The order this flow moves in, and why it changed on 2026-09-10.
 *
 * It used to run story → goal → options → path, with the whole of the rest — the grounds, the
 * memorandum, the draft letter and the hand-over to a free service — stacked inside "path".
 * Two things were wrong with that. The hand-over to a human led the result whenever any flag
 * was ticked, and a help list sat in the middle of the options, so a person who came here for
 * guidance was told to go and ask someone else before we had told them anything. And the
 * grounds arrived at the very end, as a checklist with nowhere to say what happened on each
 * one, so the memo read as though the points were ours rather than theirs.
 *
 * Now: they tell us what happened, say what they want, see the routes, mark the points that
 * sound like their situation AND write against each one, get the memorandum, and only then
 * are handed to a person — as the next step, not as the answer.
 *
 * The one exception is timing. Where a flag says the deadline is imminent or already passed,
 * or a hearing is on foot, or someone is held, a short banner still sits at the top of every
 * view. Those cannot wait for six screens.
 */
const RESULT_VIEWS: ResultView[] = ["story", "goal", "options", "grounds", "memo", "help"];

/** What /api/memo hands back, once it has cleared every gate. */
interface MemoDraft {
  summary: string;
  application: { groundId: string; forThem: string; against: string; toTest: string }[];
}

/** The key the internal-review note is filed under, so the memo can find it. */
const INTERNAL_NOTE_KEY = "What you are asking them to look at again";

/**
 * What someone wants out of this. Multi-select, because people arrive with more than one —
 * "I want the debt gone AND they never told me". Each maps to the routes that can deliver
 * it, and the mapping ORDERS the options rather than filtering them: hiding a path someone
 * did not think to ask for is how an app decides for them.
 */
export const GOALS = [
  { id: "outcome", routes: ["merits-review", "internal-review"] },
  { id: "lawful", routes: ["judicial-review"] },
  { id: "information", routes: ["information-commissioner"] },
  { id: "treatment", routes: ["ombudsman"] },
  { id: "unsure", routes: [] },
] as const;
export type GoalId = (typeof GOALS)[number]["id"];

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

/**
 * The tripwire questions, and where each one can honestly apply.
 *
 * They were one fixed list shown to everyone, so a person who had picked "fine or
 * infringement notice" was asked whether their decision was about child protection,
 * guardianship or a visa. None of those can be true of a fine, and a page of questions that
 * obviously do not fit teaches the reader that this form is not about them — on the step
 * where we most need them to answer carefully.
 *
 * SCOPED CONSERVATIVELY, because these are safety gates. Hiding a question that could apply
 * is the dangerous error; showing a redundant one is only noise. So a flag is narrowed only
 * where it is definitionally impossible for the chosen area, never where it is merely
 * unlikely — someone in prison can have a Centrelink debt, and a fine can become a
 * prosecution, so those stay everywhere.
 */
const FLAG_KEYS: {
  key: keyof TripwireFlags;
  label: string;
  /** Used instead of `label` for Commonwealth decisions, where the example differs. */
  labelCth?: string;
  hint?: string;
  /** Shown only for these jurisdictions. Omitted means every jurisdiction. */
  jurisdictions?: Jurisdiction[];
  /**
   * Shown only on the catch-all entries.
   *
   * These ask what the DECISION ITSELF is about. Once someone has picked a named area the
   * answer is already known and cannot be yes — a public-housing decision is not a
   * guardianship order — so the question is only live where we do not yet know what the
   * decision is.
   */
  genericOnly?: boolean;
}[] = [
  // The family/mental-health flag is the one people over-tick: it must read as "the
  // DECISION is one of these", not "my life involves one of these", or the Centrelink,
  // housing and fines users this service exists for get handed away.
  { key: "family", label: "flagFamily", hint: "flagFamilyHint", genericOnly: true },
  { key: "criminal", label: "flagCriminal", hint: "flagCriminalHint" },
  { key: "detention", label: "flagDetention", hint: "flagDetentionHint" },
  { key: "migration", label: "flagMigration", jurisdictions: ["Cth"], genericOnly: true },
  { key: "hearingBooked", label: "flagHearing" },
  { key: "deadlineImminentOrPassed", label: "flagDeadline" },
  // The example tribunal has to be one that could have decided THIS. VCAT cannot have
  // decided a Centrelink matter, and naming it there reads as a form written for
  // somebody else.
  { key: "tribunalDecision", label: "flagTribunal", labelCth: "flagTribunalCth", hint: "flagTribunalHint" },
];

export interface FaqLink {
  slug: string;
  question: string;
}

export function RightsSaverClient({
  meritsReview,
  judicialReview,
  jrGrounds,
  concepts = [],
  faqsByEntry = {},
  corpusByEntry = {},
}: {
  meritsReview: Process;
  judicialReview: Process;
  jrGrounds: Ground[];
  /** Structural nodes (remedies, standing, the complaint routes) — explanatory only. */
  concepts?: Concept[];
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
  // Which result step is on screen. It lives in the result component, and the header — a
  // sibling — needs it to say where the person is in the whole journey.
  const [resultView, setResultView] = useState<ResultView>("story");
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
    if (area && getDataEntry(area)) {
      const wantsResult = p.get("step") === "result";
      if (wantsResult && sessionConsented()) {
        setConsent(true);
        setStep("result");
      } else {
        setStep("what");
      }
    }
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
  // Every step change starts at the top, not wherever the last one was scrolled to.
  //
  // The consent box sits near the bottom of question two, so pressing "See my next steps"
  // left the reader ~500px down a brand-new page — past the heading, the disclaimer and the
  // step nav that say what they are looking at.
  //
  // Scroll restoration is turned off HERE, in the component that owns the history pushes.
  // Each step change pushes an entry, and with the default "auto" the browser reapplies the
  // offset it remembers for that entry — after our scroll, which is why setting this in the
  // result component was too late to help. The scroll itself waits a frame so it lands after
  // the new step has painted and the page is tall enough to hold it.
  useEffect(() => {
    if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
  }, []);
  useEffect(() => {
    // INSTANT, not smooth. The stylesheet sets `scroll-behavior: smooth` globally, which is
    // right for jumping to an anchor on the page you are already reading and wrong here: a
    // step change would animate the reader a thousand pixels up a page they have not seen,
    // taking about a second to arrive. A new step should simply start at its top.
    //
    // Twice, deliberately: once now, and once after the next step has painted. The new step
    // is taller than the old one, so a scroll fired before layout can be undone as the page
    // grows under it.
    const toTop = () => window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    toTop();
    const id = window.requestAnimationFrame(toTop);
    return () => window.cancelAnimationFrame(id);
  }, [step]);
  // The result step named in the URL when this page was LOADED.
  //
  // Captured during the first render, because by the time anything else could read it, it
  // is gone: `step` starts at "who" on a fresh load, so the URL effect below runs once with
  // step !== "result", rewrites the query without `view`, and the result component — which
  // only mounts once step becomes "result" — then finds nothing to restore. That is why
  // Back from a ground's explainer landed on "tell us what happened" however faithfully the
  // step had been recorded.
  const initialViewRef = useRef<string | null | undefined>(undefined);
  if (initialViewRef.current === undefined) {
    initialViewRef.current =
      typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("view");
  }
  useEffect(() => {
    // Runs for EVERY step including "who". Skipping it left lastStepRef null on the first
    // move, so who -> what replaced the entry instead of pushing one, and there was no step 1
    // to go back to.
    const p = new URLSearchParams();
    if (jurisdiction) p.set("jur", jurisdiction);
    if (areaId) p.set("area", areaId);
    if (decisionDate) p.set("date", decisionDate);
    p.set("step", step);
    // Keep the result step the person is on. This rebuilt the query FROM SCRATCH, so it
    // dropped `view` on every run — including the run right after a Back from a Learn page,
    // which is exactly when it is needed. The result then restored to the top of the flow
    // however carefully the view had been recorded.
    const currentView =
      new URLSearchParams(window.location.search).get("view") ?? initialViewRef.current;
    if (step === "result" && currentView) p.set("view", currentView);
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
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, []);

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
    rememberConsent(false);
    setRelatedGrounds([]);
    // Start over means start over. The per-tab restore holds what they wrote, so leaving it
    // behind would hand their account to whoever used the machine next.
    forgetFlow();
  }

  function toggleGround(id: string) {
    setRelatedGrounds((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));
  }

  // Where they are in the WHOLE journey: two questions, then the six result steps. It used
  // to count the questions only and call everything after them "step 3 of 3", so someone who
  // had just reached "tell us what happened" was told they had finished.
  const stepNo =
    step === "who" ? 1 : step === "what" ? 2 : 3 + Math.max(0, RESULT_VIEWS.indexOf(resultView));
  const stepTotal = 2 + RESULT_VIEWS.length;

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
        stepTotal={stepTotal}
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
              jurisdiction={jurisdiction}
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
              concepts={concepts}
              relatedGrounds={relatedGrounds}
              onToggleGround={toggleGround}
              onRestoreGrounds={setRelatedGrounds}
              onViewChange={setResultView}
              initialView={initialViewRef.current ?? null}
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
  stepTotal,
  t,
  onReset,
  onReplayGuide,
}: {
  stepNo: number;
  stepTotal: number;
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
        {t("stepOf", { n: stepNo, total: stepTotal })}
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
  jurisdiction,
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
  jurisdiction: Jurisdiction | null;
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
  // A catch-all entry means we do not yet know what the decision is about, which is the
  // only state in which "is the decision itself about X?" is still an open question.
  const isGenericArea = !areaId || (areas.find((a) => a.id === areaId)?.isFallback ?? false);
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
            {FLAG_KEYS.filter(
              (f) =>
                (!f.jurisdictions || (jurisdiction && f.jurisdictions.includes(jurisdiction))) &&
                (!f.genericOnly || isGenericArea),
            ).map(({ key, label, labelCth, hint }) => (
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
                  {t(jurisdiction === "Cth" && labelCth ? labelCth : label)}
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
              rememberConsent(e.target.checked);
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
  concepts,
  relatedGrounds,
  onToggleGround,
  onRestoreGrounds,
  initialView,
  onViewChange,
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
  concepts: Concept[];
  relatedGrounds: string[];
  onToggleGround: (id: string) => void;
  /** Restores the ticked grounds after a trip out of the flow — the parent owns them. */
  onRestoreGrounds: (ids: string[]) => void;
  /** The `?view=` this page loaded with, captured before the URL was rewritten. */
  initialView: string | null;
  /** Reports the step on screen, so the header can count the whole journey. */
  onViewChange: (v: ResultView) => void;
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
  // Which of the four result steps is on screen, and what they told us on the way.
  const [view, setView] = useState<ResultView>("story");
  // What the person wrote against each ground they marked.
  //
  // Marking a ground said "this sounds like my situation" and nothing more, so the memo could
  // set out the law on a point without a word from the person about what actually happened on
  // it. Their words go into the memo verbatim, under the ground they wrote them against, and
  // are never characterised as evidence or as making the point out.
  const [groundNotes, setGroundNotes] = useState<Record<string, string>>({});
  // Which approach the person has chosen to work through. Everything after the options view
  // follows from it: which points they are asked about, which application draft they get,
  // and what the memorandum works through. Null until they pick — the app orders the paths
  // but never picks for them.
  const [chosenPath, setChosenPath] = useState<PathId | null>(null);
  // Merits review is not argued on grounds of review — it is argued on what the tribunal
  // decides for this kind of decision, which the lawyer supplied per scheme. So someone who
  // picks merits review writes against those criteria, not against seventeen judicial-review
  // grounds that do not apply to what they are doing.
  const [criteriaNotes, setCriteriaNotes] = useState<Record<string, string>>({});
  // Which criteria the person says relate to them. The step used to put an open box under
  // every line and expect all of them filled in — four mandatory boxes on a Victorian fine,
  // including some under lines there is nothing to answer. Ticking first is the same shape
  // as the grounds step, and it means we ask for what they have to say and nothing else.
  const [pickedCriteria, setPickedCriteria] = useState<string[]>([]);
  const [goals, setGoals] = useState<GoalId[]>([]);
  const [goalOther, setGoalOther] = useState("");
  const viewIdx = RESULT_VIEWS.indexOf(view);
  useEffect(() => {
    onViewChange(view);
  }, [view, onViewChange]);
  const topRef = useRef<HTMLDivElement | null>(null);

  // Moving between result steps pushes history, so Back walks them. Scroll to the top too:
  // without it a step change looks like nothing happened on a long page.
  function goView(next: ResultView) {
    setView(next);
    try {
      const u = new URL(window.location.href);
      u.searchParams.set("view", next);
      window.history.pushState({ view: next }, "", u);
    } catch {
      /* history unavailable — the step still changes */
    }
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  useEffect(() => {
    function onPop() {
      const v = new URLSearchParams(window.location.search).get("view");
      setView(RESULT_VIEWS.includes(v as ResultView) ? (v as ResultView) : "story");
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Same jurisdiction rule as the grounds: an unscoped concept applies everywhere, and a
  // scoped one only where it exists. The two federal routes must not surface in Victoria.
  const shownConcepts = useMemo(
    () => concepts.filter((c) => c.jurisdictions.length === 0 || c.jurisdictions.includes(jurisdiction)),
    [concepts, jurisdiction],
  );
  // `null` means "whichever path comes first for this decision" — resolved once we know it.
  const [applyKind, setApplyKind] = useState<DraftKind | null>(null);
  const [applyCopied, setApplyCopied] = useState(false);
  // What the person types about their own situation. Held in component state only: it is
  // never written to storage, never put in the URL, and never sent anywhere. It exists to be
  // composed into a letter they then send themselves.
  const [account, setAccount] = useState<Record<string, string>>({});

  // ---- Coming back to where you were -----------------------------------------------
  //
  // Following a link out of the flow — a ground's own explainer, a Learn page — and pressing
  // Back is a FULL PAGE LOAD. The step was mirrored into `?view=` but only ever read on
  // popstate, so it was never applied on a fresh load; and everything the person had typed
  // lived in React state, which the load wipes. Someone who tapped a ground heading to find
  // out what it meant came back to the top of the result with their notes gone.
  //
  // Restored per tab, from sessionStorage, and only where the consent flag from this tab is
  // present — the same rule the consent gate already uses, so a shared link still cannot
  // restore anyone's answers. It never leaves the device and it dies with the tab, which is
  // what the privacy note on these steps promises. "Start over" clears it.
  useEffect(() => {
    if (!sessionConsented()) return;
    try {
      const v = initialView ?? new URLSearchParams(window.location.search).get("view");
      if (RESULT_VIEWS.includes(v as ResultView)) setView(v as ResultView);
      const raw = window.sessionStorage.getItem(FLOW_KEY);
      if (!raw) return;
      const f = JSON.parse(raw) as Partial<FlowState>;
      if (f.chosenPath) setChosenPath(f.chosenPath);
      if (f.goals) setGoals(f.goals);
      if (typeof f.goalOther === "string") setGoalOther(f.goalOther);
      if (f.account) setAccount(f.account);
      if (f.relatedGrounds) onRestoreGrounds(f.relatedGrounds);
      if (f.groundNotes) setGroundNotes(f.groundNotes);
      if (f.criteriaNotes) setCriteriaNotes(f.criteriaNotes);
      if (f.pickedCriteria) setPickedCriteria(f.pickedCriteria);
    } catch {
      /* storage or JSON unavailable — the flow simply starts fresh, which is safe */
    }
    // Mount only: later changes are written by the effect below, never read back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!sessionConsented()) return;
    // NEVER blank a real saved answer set.
    //
    // Both effects fire in the same commit on mount, and this one sees the state as it was
    // BEFORE the restore's setState lands — which is empty. A flag set by the restore does
    // not help, because it is already set by the time this runs. So the rule is about the
    // values themselves: a completely empty flow may not overwrite a stored one.
    //
    // The only way to reach genuinely-empty state with a blob on disk is this mount window,
    // or someone deleting every answer by hand — and for that, "Start over" is the control
    // that clears it, explicitly.
    const empty =
      !chosenPath &&
      goals.length === 0 &&
      !goalOther.trim() &&
      Object.keys(account).length === 0 &&
      relatedGrounds.length === 0 &&
      Object.keys(groundNotes).length === 0 &&
      Object.keys(criteriaNotes).length === 0 &&
      pickedCriteria.length === 0;
    try {
      if (empty && (window.sessionStorage.getItem(FLOW_KEY)?.length ?? 0) > 2) return;
    } catch {
      /* storage unreadable — fall through and try the write */
    }
    try {
      const f: FlowState = {
        chosenPath,
        goals,
        goalOther,
        account,
        relatedGrounds,
        groundNotes,
        criteriaNotes,
        pickedCriteria,
      };
      window.sessionStorage.setItem(FLOW_KEY, JSON.stringify(f));
    } catch {
      /* quota or private mode — losing the restore is not worth breaking the step */
    }
  }, [chosenPath, goals, goalOther, account, relatedGrounds, groundNotes, criteriaNotes, pickedCriteria]);
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
  // Which STOP reasons cannot wait for the last view.
  //
  // The clock cases are already handled: lib/tripwire keeps timing separate as `urgent`, and
  // that banner has always shown on every view. This is the other kind — `urgentPerson`,
  // which marks someone held, a criminal matter, or child protection and compulsory
  // treatment. Those are listed within days, so a phone number cannot wait for view six.
  //
  // Everything else that stops — migration, a privative clause — is a SCOPE problem, and
  // scope keeps perfectly well until the hand-over at the end.
  const urgentNow = caps.urgentPerson;

  // The tripwire no longer STOPS the flow.
  //
  // It used to return a hand-over screen instead of the result, so ticking any box under
  // "Does any of these apply?" replaced the whole analysis with "talk to a free legal
  // service". That is backwards: the person chose a decision type, and the analysis is about
  // THAT decision type — their circumstances are extra context, not a reason to withhold
  // everything. So the hand-over now leads, prominently and with a phone number, and the
  // full analysis and pathway follow it. Nothing is hidden.

  const av = avenueView(entry);
  const plan = planFor({
    avenue: av,
    meritsReview,
    judicialReview,
    jurisdiction,
    criteria: entry.mrCriteria ?? [],
    internalCriteria: entry.irCriteria ?? [],
  });
  // Read off the plan so the points step, the memo and the card cannot disagree.
  const internalCriteria = entry.irCriteria ?? [];
  const meritsIsTribunal = (av.mrCharacter ?? "tribunal") === "tribunal";

  // ---- Which criteria are POINTS, and which are only orientation -------------------
  //
  // Not every line in a criteria list is something a person can answer. Some say what the
  // body decides — "the reviewing agency decides whether the fine should stand or be
  // cancelled" — and someone can say what happened on that. Others say which path applies:
  // "internal review and asking for the matter to be heard in court are two different
  // choices, not steps in order". There is nothing to write against that, and the step was
  // putting a text box under it anyway.
  //
  // The data already marks them. A routing line is the one that appears in BOTH lists,
  // because that is exactly why it is in both — it is about choosing between the bodies,
  // not about what either one decides. So no new field, and nothing to keep in sync.
  const criteriaIsContext = (c: string) =>
    (entry.irCriteria ?? []).includes(c) && (entry.mrCriteria ?? []).includes(c);
  const splitCriteria = (list: string[]) => ({
    context: list.filter(criteriaIsContext),
    points: list.filter((c) => !criteriaIsContext(c)),
  });

  // The application letters differ by path: merits review asks a tribunal for the correct
  // or preferable decision on the facts; judicial review is a court process about how the
  // decision was made, so its draft opens with a warning and is framed as something to take
  // to a free service. The person picks which one they mean; nothing is chosen for them.
  const APPLY_BY_PATH = {
    "internal-review": {
      id: "internal-review-request" as DraftKind,
      label: t("applyInternal"),
      hint: t("applyInternalHint"),
      href: "/learn/how-review-fits-together/internal-review",
    },
    "merits-review": {
      id: "merits-review-application" as DraftKind,
      label: t("applyMerits"),
      hint: t("applyMeritsHint"),
      href: "/learn/merits-review",
    },
    "judicial-review": {
      id: "judicial-review-application" as DraftKind,
      label: t("applyJudicial"),
      hint: t("applyJudicialHint"),
      href: "/learn/judicial-review",
    },
  } as const;
  const applyKinds = plan.paths
    // A NON-TRIBUNAL merits path gets no letter. For a Victorian fine this field holds the
    // Magistrates' Court on election, and the merits-review letter asks the agency to look
    // at the decision "afresh on the facts, so that the correct or preferable decision can
    // be made" — which is neither what an election is nor what that court does. Electing to
    // go to court is a formal step under the scheme's own Act; we hold no verified form for
    // it, so the app says so and routes to a free service rather than drafting something
    // that looks official and is not.
    .filter((pp) => !(pp.id === "merits-review" && pp.character !== "tribunal"))
    .map((pp) => ({ ...APPLY_BY_PATH[pp.id], pathId: pp.id }));
  // Only the application for the approach they chose. Offering both put a judicial-review
  // draft in front of someone working through merits review, which is a different document
  // to a different body about a different question.
  const offeredApply = chosenPath ? applyKinds.filter((k) => k.pathId === chosenPath) : applyKinds;
  const activeApply = offeredApply.find((k) => k.id === applyKind) ?? offeredApply[0];
  // True when the person chose a path we deliberately hold no letter for, so the memo view
  // can say that rather than silently dropping the section.
  const noLetterForPath =
    chosenPath === "merits-review" && !meritsIsTribunal && plan.paths.some((p) => p.id === "merits-review");
  // ONE box. Five labelled questions read as a form to fill in, and a frightened person on a
  // phone abandons forms; they will tell the story once, in their own order, if asked once.
  // The prompts that were the question labels become hints under the box, so nothing is lost.
  //
  // The internal-review note is a second block, and only on that path's letter: what someone
  // types under "what you are asking them to look at again" IS the substance of that letter,
  // and it reached the memo but never the draft, so the letter kept its placeholder.
  const universalQs = [
    { id: "q-story", label: t("accountQStory") },
    ...(chosenPath === "internal-review" && (criteriaNotes[INTERNAL_NOTE_KEY] ?? "").trim()
      ? [{ id: "q-internal", label: t("internalAskTitle") }]
      : []),
  ];

  const applyDraft =
    corpusEntry && activeApply
      ? composeLetter({
          entry: corpusEntry,
          kind: activeApply.id,
          account: {
            answers: {
              ...account,
              // What they wrote on the internal-review step, so the letter carries it.
              "q-internal": (criteriaNotes[INTERNAL_NOTE_KEY] ?? "").trim(),
              // Their own words on a ground go in first; a picked sentence for the same
              // ground overwrites it below, because a sentence they ticked is one they have
              // already approved for a letter someone else will read.
              ...Object.fromEntries(
                Object.entries(groundNotes)
                  .filter(([id, v]) => relatedGrounds.includes(id) && v.trim())
                  .map(([id, v]) => [`g-${id}`, v.trim()]),
              ),
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

  // What is actually on this VIEW, in the order it appears.
  //
  // This listed the whole result regardless of which view was showing, which was harmless
  // while everything lived on one long page. Since the flow was split into six views it
  // would send a reader to an anchor that is not on screen, which is worse than no list.
  const hasPaths = plan.paths.length > 0;
  // Whether the points step has anything on it. Each approach asks for something different:
  // the tribunal's criteria for this scheme, one open question for an internal review, or
  // the grounds of review for a court. Without a choice it shows the prompt to go back.
  const groundsSectionShown =
    chosenPath === "merits-review"
      ? entry.mrCriteria.length > 0
      : chosenPath === "internal-review"
        ? true
        : chosenPath === "judicial-review"
          ? shownGrounds.length > 0
          : false;
  // ---- The points step, built from what they have already told us -------------------
  //
  // The step used to open on a static list with no sign it was about this person's matter:
  // the same heading and the same points whatever they had said on the two steps before it.
  // Someone who had just written six paragraphs met a bare checklist and had to hold their
  // own account in their head while filling it in.
  //
  // What is carried forward is only what they typed or chose — their decision, its date,
  // the approach they picked, what they said they were hoping for, and their account, shown
  // back so they can work from it instead of from memory. Nothing is inferred FROM it: the
  // points are not reordered, scored or pre-ticked against their story. Ranking points by
  // what someone wrote is the app forming a view about their case, which is the line this
  // product does not cross — the memo has refused to rank grounds since 2026-08-22 and this
  // step follows the same rule.
  // Why Continue is off, or null when it is on. A reason, not a silent dead button — a
  // disabled control with no explanation reads as the app being broken.
  const nextBlockedReason =
    view === "story" && !(account["q-story"] ?? "").trim()
      ? t("nextNeedsStory")
      : view === "goal" && goals.length === 0 && !goalOther.trim()
        ? t("nextNeedsGoal")
        : null;

  const pointsSaidGoals = [
    ...goals.map((g) => t(`goal_${g}`)),
    ...(goalOther.trim() ? [goalOther.trim()] : []),
  ];
  const pointsStory = (account["q-story"] ?? "").trim();
  const pointsWrittenCount =
    chosenPath === "judicial-review"
      ? relatedGrounds.filter((id) => (groundNotes[id] ?? "").trim()).length
      : Object.entries(criteriaNotes).filter(([, v]) => v.trim()).length;
  /**
   * The answerable points, as tick-then-write.
   *
   * Nothing is asked for until the person says the point relates to them, and the prompt
   * inside the box asks about THAT point rather than offering one example for all of them.
   * The step previously showed the same placeholder — "what the figures should have been" —
   * under a fines criterion about mistaken identity.
   */
  const renderPoints = (list: string[], idPrefix: string) => {
    const { context, points } = splitCriteria(list);
    return (
      <>
        {context.length > 0 && (
          <div className="mt-5 rounded-card border-2 border-amber-border bg-amber-bg px-4 py-3">
            <p className="font-display text-[12.5px] font-black uppercase tracking-[0.1em] text-amber-ink">
              {t("criteriaContextTitle")}
            </p>
            <ul className="mt-1.5 space-y-1.5 text-[15px] leading-snug text-ink-soft">
              {context.map((c) => (
                <li key={c} className="flex gap-2">
                  <span aria-hidden="true" className="mt-[8px] h-1.5 w-1.5 flex-none rounded-[2px] bg-amber-ink" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {points.length > 0 && (
          <div className="mt-5 space-y-3">
            {points.map((c, i) => {
              const on = pickedCriteria.includes(c);
              return (
                <div key={c} className="rounded-card border-2 border-line bg-cream px-4 py-3">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() =>
                        setPickedCriteria((prev) =>
                          prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
                        )
                      }
                      className="mt-[3px] h-5 w-5 flex-none accent-help"
                    />
                    <span className="text-[15.5px] font-semibold leading-snug text-ink">{c}</span>
                  </label>
                  {on && (
                    <div className="mt-3">
                      <label
                        htmlFor={`${idPrefix}-${i}`}
                        className="block text-[14.5px] leading-snug text-ink-faint"
                      >
                        {t("criteriaAsk")}
                      </label>
                      <textarea
                        id={`${idPrefix}-${i}`}
                        value={criteriaNotes[c] ?? ""}
                        onChange={(e) => setCriteriaNotes((prev) => ({ ...prev, [c]: e.target.value }))}
                        rows={3}
                        placeholder={t("criteriaPlaceholder")}
                        className="input mt-1.5 w-full"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </>
    );
  };

  const pointsContext = (
    <div className="mt-4 rounded-card border-2 border-line bg-cream px-4 py-3.5">
      <p className="font-display text-[12.5px] font-black uppercase tracking-[0.1em] text-ink-faint">
        {t("pointsContextTitle")}
      </p>
      <dl className="mt-2 space-y-1 text-[15px] leading-snug text-ink-soft">
        <div className="flex flex-wrap gap-x-2">
          <dt className="font-semibold text-ink">{t("pointsContextDecision")}:</dt>
          <dd>
            {entry.title}
            {decisionDate ? ` — ${t("pointsContextDated")} ${decisionDate}` : ""}
          </dd>
        </div>
        <div className="flex flex-wrap gap-x-2">
          <dt className="font-semibold text-ink">{t("pointsContextApproach")}:</dt>
          <dd>
            {midSentence(
              plan.paths.find((pp) => pp.id === chosenPath)?.body ??
                t("pointsContextApproachUnknown"),
            )}
          </dd>
        </div>
        {pointsSaidGoals.length > 0 && (
          <div className="flex flex-wrap gap-x-2">
            <dt className="font-semibold text-ink">{t("pointsContextWants")}:</dt>
            <dd>{pointsSaidGoals.join("; ")}</dd>
          </div>
        )}
      </dl>
      {/* Their own account, to hand. Collapsed by default so it does not push the points
          off a phone screen, and never edited from here — this is the copy they wrote. */}
      {pointsStory && (
        <details className="mt-3 border-t-2 border-line pt-3">
          <summary className="cursor-pointer text-[15px] font-semibold text-ink hover:text-red-ink">
            {t("pointsContextStory")}
          </summary>
          <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-ink-soft">
            {pointsStory}
          </p>
          <button type="button" onClick={() => goView("story")} className="link-text mt-2 inline-flex min-h-[44px]">
            {t("pointsContextEdit")}
          </button>
        </details>
      )}
      {pointsWrittenCount > 0 && (
        <p className="mt-3 text-[14.5px] font-semibold leading-snug text-help-ink">
          {t("pointsWritten", { n: pointsWrittenCount })}
        </p>
      )}
    </div>
  );

  const contents = (
    {
      story: [{ id: "r-account", label: t("accountTitle") }],
      goal: [{ id: "r-goal", label: t("goalTitle") }],
      options: [
        ...(hasPaths ? [{ id: "r-learn", label: t("learnTitle") }] : []),
        { id: "r-analysis", label: t("analysisTitle") },
        ...(shownConcepts.length > 0 ? [{ id: "r-concepts", label: t("conceptsTitle") }] : []),
      ],
      grounds: groundsSectionShown ? [{ id: "r-grounds", label: t("groundsTitle") }] : [],
      // In the order the sections actually appear. The memo moved to the top of this step
      // when it stopped being the last thing under a letter template, and this list kept
      // announcing it as item four — so the contents disagreed with the page it described.
      memo: [
        { id: "r-memo", label: t("memoSectionTitle") },
        ...(applyDraft || noLetterForPath ? [{ id: "r-apply", label: t("applyTitle") }] : []),
        { id: "r-reasons", label: t("reasonsTitle") },
        ...(faqs.length > 0 ? [{ id: "r-faq", label: t("faqTitle") }] : []),
      ],
      help: [{ id: "r-handoff", label: t("handoffTitle") }],
    } as Record<ResultView, { id: string; label: string }[]>
  )[view];
  // The internal-review concept, read by the in-place explainer above the cards and by the
  // memo. Taken from the corpus so this wording and the page behind it cannot drift apart.
  const internalReview = shownConcepts.find((c) => c.id === "internal-review");

  const dl = deadlineRuleView(entry);
  const template = reasonsRequestTemplate(entry, {
    about: entry.title.toLowerCase(),
    decisionDate: decisionDate || undefined,
  });

  const [memoCopied, setMemoCopied] = useState(false);
  // The memorandum works through the approach the person chose. Before, it always used the
  // first path in the plan, so someone who had deliberately picked judicial review got a
  // memo about merits review.
  const memoPathId = chosenPath ?? plan.primary?.id ?? "merits-review";
  const memoProcess =
    memoPathId === "internal-review"
      ? null
      : memoPathId === "judicial-review"
        ? judicialReview
        : meritsReview;
  const memoPath = plan.paths.find((pp) => pp.id === memoPathId);
  const memoPathBody = memoPath?.body ?? plan.primary?.body ?? "";
  // ---- The drafted application ------------------------------------------------------
  //
  // The ONE step of this flow that leaves the device. Everything before it is computed here
  // and sent nowhere; on this step the person's own words go to our server so the analysis
  // can be written around them, and come straight back. Nothing is stored: there is no
  // database behind it, and the request is discarded on response.
  //
  // Fails silently ON PURPOSE. A blocked cost guard, a missing key, a gate rejection or a
  // dropped connection all end the same way — `drafted` stays null and the deterministic
  // memo is what the person reads. That memo needs no model at all, so the worst outcome
  // here is the product as it was before this existed, never a blank page or an error.
  const [drafted, setDrafted] = useState<MemoDraft | null>(null);
  const [drafting, setDrafting] = useState(false);
  useEffect(() => {
    if (view !== "memo") return;
    const story = (account["q-story"] ?? "").trim();
    if (!story) return;
    let live = true;
    setDrafting(true);
    const notes: Record<string, string> = {};
    for (const [k, v] of Object.entries(groundNotes)) if (v.trim()) notes[k] = v;
    for (const [k, v] of Object.entries(criteriaNotes)) if (v.trim()) notes[k] = v;
    fetch("/api/memo", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        entryId: entry.id,
        pathId: memoPathId,
        forum: memoPathBody,
        pathName: memoProcess?.plainName ?? internalReview?.plainName ?? "",
        groundIds: relatedGrounds,
        criteria: memoPath?.criteria ?? [],
        story: [story, (account["q-more"] ?? "").trim()].filter(Boolean).join("\n\n"),
        notes,
      }),
    })
      .then((r) => r.json())
      .then((d: { status?: string; summary?: string; application?: MemoDraft["application"] }) => {
        if (!live || d?.status !== "answered") return;
        setDrafted({ summary: d.summary ?? "", application: d.application ?? [] });
      })
      .catch(() => {
        /* offline, blocked, or rejected — the composed memo stands on its own */
      })
      .finally(() => {
        if (live) setDrafting(false);
      });
    return () => {
      live = false;
    };
    // Re-drafts when the approach, the marked points or their words change — the things the
    // analysis is actually about. Not on every keystroke: `q-more` is read when the step is
    // entered and when the path changes, which is what the deterministic memo already does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, memoPathId, entry.id, relatedGrounds.join("|")]);

  const memo = composeMemo({
    drafted,
    entry,
    process: memoProcess,
    internal: memoPathId === "internal-review" ? (internalReview ?? null) : null,
    internalNote: criteriaNotes[INTERNAL_NOTE_KEY] ?? "",
    // Both come from the plan, so the memo cannot disagree with the card the person read.
    // Re-deriving them from the process is what gave the fines Magistrates' Court a
    // tribunal's question and remedies in the one document a lawyer actually reads.
    character: memoPath?.character ?? "tribunal",
    criteria: memoPath?.criteria ?? [],
    // Grounds of review belong to judicial review. Carrying them into a memo about an
    // internal review or a tribunal would put a court's language in a letter to neither.
    grounds:
      memoPathId === "judicial-review"
        ? shownGrounds.filter((g) => relatedGrounds.includes(g.id))
        : [],
    groundNotes,
    criteriaNotes,
    // Their account, plus anything they added on the memo step itself. Quoted the same way
    // — as their own paragraphs — so adding to it improves the memo rather than appending a
    // differently-labelled afterthought.
    story: [account["q-story"] ?? "", account["q-more"] ?? ""]
      .map((x) => x.trim())
      .filter(Boolean)
      .join("\n\n"),
    goals: goals.map((g) => t(`goal_${g}`)),
    goalOther,
    decisionDate: decisionDate || undefined,
    forum: memoPathBody || memoProcess?.plainName || t("pathTitleInternal"),
    // Provenance: which build of the procedural layer produced the rule and the source
    // printed in this memo. It is already in the client bundle, so this costs nothing.
    paths: plan.paths.map((pp) => ({
      name:
        pp.id === "internal-review"
          ? t("pathTitleInternal")
          : pp.id === "judicial-review"
            ? judicialReview.name
            : pp.character === "tribunal"
              ? meritsReview.name
              : t("pathTitleNotTribunal"),
      body: pp.body,
      question: pp.question,
      conditional: pp.conditional,
    })),
    corpusVersion: getDataIndex().builtAt,
    // Links back into our own guides, so a reader holding the memo can reach the full
    // explanation of any point in it. Absolute, because the memo is a plain-text file
    // that leaves the site.
    siteUrl: siteUrl(),
    pathHref:
      memoPathId === "internal-review"
        ? "/learn/how-review-fits-together/internal-review"
        : memoPathId === "judicial-review"
          ? "/learn/judicial-review"
          : "/learn/merits-review",
    t: (k) => t(k),
  });

  /**
   * The one document, downloaded.
   *
   * This used to build a SECOND, thinner "matter summary" from lib/handoff — so the person
   * had a memo on one step and a different document on the next, both to hand to the same
   * lawyer. The hand-over offered the thinner one. What a legal service actually needs is
   * the analysis, so both steps now offer the memo, and the paths the summary listed have
   * moved into it.
   */
  function downloadMemo() {
    const blob = new Blob([memo.body], { type: "text/plain;charset=utf-8" });
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

  // Only the paths that exist for this decision, ordered by what the person said they want.
  // Goals ORDER, never filter — see the GOALS comment.
  const wantedRoutes = new Set(
    goals.flatMap((g) => (GOALS.find((x) => x.id === g)?.routes ?? []) as readonly string[]),
  );
  const orderedPaths = [...plan.paths].sort(
    (a, b) => Number(wantedRoutes.has(b.id)) - Number(wantedRoutes.has(a.id)) || a.order - b.order,
  );
  // Internal review is promoted into the three-approaches section above, so it comes out of
  // "the bits around the edges" — otherwise the same card appears twice on one view, once as
  // a headline route and once as a footnote, which is a worse answer than either.
  const orderedConcepts = shownConcepts
    .filter((c) => c.id !== "internal-review")
    .sort((a, b) => Number(wantedRoutes.has(b.id)) - Number(wantedRoutes.has(a.id)) || a.order - b.order);

  return (
    <div className="space-y-6" ref={topRef}>
      <div>
        <p className="eyebrow text-red-ink">{t("resultEyebrow")}</p>
        <h1 className="mt-2 font-display text-[30px] font-black leading-[1.05] text-ink sm:text-[38px]">{entry.title}</h1>
      </div>

      {/* Where they are in the four steps. A plain ordered list, not a decorative bar: it is
          read by a screen reader as "step 2 of 4" and it is how someone jumps back. */}
      <nav aria-label={t("stepsNavLabel")} className="rounded-card border-2 border-line bg-cream px-4 py-3">
        <ol className="flex flex-wrap gap-x-2 gap-y-1.5 text-[14.5px]">
          {RESULT_VIEWS.map((v, i) => {
            const done = i < viewIdx;
            const here = v === view;
            return (
              <li key={v} className="flex items-center gap-2">
                {i > 0 && <span aria-hidden="true" className="text-ink-faint">›</span>}
                {done ? (
                  <button
                    type="button"
                    onClick={() => goView(v)}
                    className="link-text min-h-[44px] font-semibold"
                  >
                    {t(`view_${v}`)}
                  </button>
                ) : (
                  <span
                    aria-current={here ? "step" : undefined}
                    className={here ? "font-display font-black text-ink" : "text-ink-faint"}
                  >
                    {t(`view_${v}`)}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <Disclaimer />

      {/* A person who is held, facing a criminal matter, or up against a limit that is
          imminent or already gone cannot wait six views for a phone number. This banner is
          short and it does not replace anything — the full hand-over is the last view.
          Everything else waits for that view, because someone who came here for guidance
          should be given the guidance before being sent elsewhere. */}
      {trip.stop && urgentNow && view !== "help" && (
        <div className="rounded-card border-2 border-help bg-help-soft px-4 py-3.5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="min-w-0 flex-1 text-[15.5px] font-medium leading-snug text-help-ink">
              {t("urgentBanner")}
            </p>
            {stopServices[0]?.phone && (
              <CallButton phone={stopServices[0].phone} label={stopServices[0].service} withName />
            )}
            <button type="button" onClick={() => goView("help")} className="link-text min-h-[44px] font-semibold text-help-ink">
              {t("urgentBannerLink")}
            </button>
          </div>
        </div>
      )}

      {/* The hand-over, in full. It closes the flow rather than opening it. */}
      {trip.stop && view === "help" && (
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
                    <CallButton phone={stopServices[0].phone} label={stopServices[0].service} withName />
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
      {view === "goal" && (
        <section id="r-goal" className="card">
          <h2 className="font-display text-[21px] font-black text-ink">{t("goalTitle")}</h2>
          <p className="mt-2 text-[15.5px] leading-relaxed text-ink-soft">{t("goalLead")}</p>

          <fieldset className="mt-5 space-y-2.5">
            <legend className="sr-only">{t("goalTitle")}</legend>
            {GOALS.map((g) => {
              const on = goals.includes(g.id);
              return (
                <label
                  key={g.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-card border-2 px-4 py-3 transition ${
                    on ? "border-red-cta bg-cream" : "border-line bg-paper hover:border-ink-faint"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-[3px] h-5 w-5 flex-none accent-red-cta"
                    checked={on}
                    onChange={() =>
                      setGoals((cur) =>
                        cur.includes(g.id) ? cur.filter((x) => x !== g.id) : [...cur, g.id],
                      )
                    }
                  />
                  <span>
                    <span className="block font-display text-[16.5px] font-black leading-snug text-ink">
                      {t(`goal_${g.id}`)}
                    </span>
                    <span className="mt-0.5 block text-[15px] leading-snug text-ink-soft">
                      {t(`goal_${g.id}_desc`)}
                    </span>
                  </span>
                </label>
              );
            })}
          </fieldset>

          <label className="mt-5 block">
            <span className="mb-1.5 block font-display text-[15.5px] font-extrabold text-ink">
              {t("goalOtherLabel")}
            </span>
            <textarea
              value={goalOther}
              onChange={(e) => setGoalOther(e.target.value)}
              rows={3}
              className="input leading-relaxed"
              placeholder={t("goalOtherPlaceholder")}
            />
          </label>

          <p className="mt-4 text-[14.5px] leading-snug text-ink-faint">{t("goalNote")}</p>
        </section>
      )}

      {/* The three approaches, before the specifics.
          The options view opened straight into "here are your paths", which assumes the
          reader already knows what a path IS. Most do not: they have had a letter, and the
          words tribunal, review and court all sound like the same expensive thing. So name
          the three ways a decision gets looked at again, in one line each, before saying
          which ones are open here.
          Every word of this comes from the corpus' own plainName and oneLine fields — the
          same text the concept and process pages carry — so it adds no legal claim. Internal
          review leads because for most decisions it is the first and cheapest step, and it
          was reachable only as a link buried under "the bits around the edges". */}
      {view === "options" && hasPaths && (
        <section id="r-learn" className="card">
          <h2 className="font-display text-[21px] font-black text-ink">{t("learnTitle")}</h2>
          <p className="mt-2 text-[15.5px] leading-relaxed text-ink-soft">{t("learnLead")}</p>
          <div className="mt-4 space-y-3">
            {/* Internal review belongs here too. This section explains "these options", and
                it listed two of the three — the one a person is most likely to use first was
                the one missing. It is a CONCEPT rather than one of the corpus's two
                processes, so it has no ProcessExplainer; what it does have is what it means,
                what it is not, and the key points, which is what the explainer shows anyway. */}
            {av.irAvailable && internalReview && (
              <details className="rounded-sticker border-2 border-line bg-cream px-4 py-3">
                <summary className="cursor-pointer py-2.5 font-display text-[17px] font-extrabold text-ink">
                  {t("pathTitleInternal")} — {internalReview.plainName}
                </summary>
                <div className="mt-4 space-y-3.5">
                  <p className="text-[16px] leading-[1.6] text-ink">{internalReview.whatItMeans}</p>
                  <div>
                    <p className="font-display text-[12.5px] font-black uppercase tracking-[0.12em] text-red-ink">
                      {t("learnKeyPoints")}
                    </p>
                    <ul className="mt-2 space-y-1.5 text-[15.5px] leading-[1.55] text-ink-soft">
                      {internalReview.keyPoints.map((k) => (
                        <li key={k} className="flex gap-2.5">
                          <span aria-hidden className="mt-[9px] h-1.5 w-1.5 flex-none rounded-[2px] bg-red" />
                          <span>{k}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {internalReview.whatItIsNot && (
                    <div>
                      <p className="font-display text-[12.5px] font-black uppercase tracking-[0.12em] text-ink-faint">
                        {t("learnWhatItIsNot")}
                      </p>
                      <p className="mt-1.5 text-[15.5px] leading-[1.55] text-ink-soft">
                        {internalReview.whatItIsNot}
                      </p>
                    </div>
                  )}
                </div>
              </details>
            )}
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

      {view === "options" && (
      <AnalysisPanel
        plan={{ ...plan, paths: orderedPaths, primary: orderedPaths[0] ?? null }}
        avenue={av}
        meritsReview={meritsReview}
        judicialReview={judicialReview}
        deadline={dl}
        chosen={chosenPath}
        onChoose={setChosenPath}
        matchesGoal={(id) => wantedRoutes.has(id)}
        tour
      />
      )}

      {/* Free help, before the reading.
          External legal review (2026-08-23): on a time-sensitive route, the official body AND a
          free service belong above optional educational content. The panel above already names
          the official body, the rule and its source; the free services only appeared at the foot
          of the page, below an explainer nobody has to read. Every route here has a time limit,
          so this is not gated on the urgency tripwire — it shows on every options view. The full
          block still closes the page. */}
      {view === "help" && <HelpList t={t} entry={entry} compact />}

      {/* Understand these options — in-flow Learn (progressive disclosure) */}
      {/* Ask for the reasons */}
      {/* Asking for written reasons is a real step, but it is not everybody's step, and it
          was open on the page for everyone. It is a disclosure now: the heading says what it
          is, and the draft appears for the people who want it. */}
      {/* The memo. IRAC, argued both ways, no prediction and no ranking — the owner's two
          worked memoranda minus the two things this app must never do.

          It LEADS this step. It used to come last, under the reasons draft, the
          application letter and a list of FAQ links, so someone who reached "your memo"
          met a letter template before a word of the analysis. The letter is what you do
          AFTER reading the analysis, so it now follows it. */}
      {view === "memo" && (
        <section id="r-memo" className="card">
          <h2 className="font-display text-[21px] font-black text-ink">{t("memoSectionTitle")}</h2>
          <p className="mt-2 text-[15.5px] leading-relaxed text-ink-soft">{t("memoSectionLead")}</p>
          {/* Said plainly, on the step it applies to, BEFORE the thing it describes. Every
              other step of this flow computes on the device and sends nothing, and the app
              says so repeatedly — so the one step where that stops being true has to say so
              just as plainly, rather than leaving an old promise to cover it. */}
          <p className="mt-3 flex items-start gap-2.5 rounded-sticker border-2 border-line bg-cream px-4 py-3 text-[14.5px] leading-relaxed text-ink-soft">
            <Icon.Lock className="mt-[3px] h-4 w-4 shrink-0 text-ink-faint" strokeWidth={2} aria-hidden />
            <span>{t("memoSendNotice")}</span>
          </p>
          {drafting && (
            <p aria-live="polite" className="mt-2 text-[14.5px] font-semibold text-help-ink">
              {t("memoDrafting")}
            </p>
          )}
          <div id="memo-text" data-memo={memo.body}>
            <MemoView blocks={memo.blocks} />
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              className="btn btn-primary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(memo.body);
                  setMemoCopied(true);
                  setTimeout(() => setMemoCopied(false), 2000);
                } catch {
                  /* clipboard unavailable — the text is selectable */
                }
              }}
            >
              {memoCopied ? t("memoCopied") : t("memoCopy")}
            </button>
            <button type="button" className="btn btn-secondary" onClick={downloadMemo}>
              {t("memoDownload")}
            </button>
          </div>

          {/* Anything else? The memo is composed from what they have told us, so the way to
              improve it is to tell us more — and until now the only route to that was
              walking back through the steps. Typing here re-composes the memo above as they
              go. The memo re-composes on the device; adding to it also re-drafts the
              analysis, which is the one part of this flow that goes to our server. */}
          <div className="mt-6 border-t-2 border-line pt-5">
            <h3 className="font-display text-[17px] font-black text-ink">{t("memoMoreTitle")}</h3>
            <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">{t("memoMoreLead")}</p>
            <label htmlFor="memo-more" className="sr-only">
              {t("memoMoreTitle")}
            </label>
            <textarea
              id="memo-more"
              value={account["q-more"] ?? ""}
              onChange={(e) => setAccount((a) => ({ ...a, "q-more": e.target.value }))}
              rows={4}
              placeholder={t("memoMorePlaceholder")}
              className="input mt-3 w-full"
            />
            <p className="mt-2 text-[14.5px] leading-snug text-ink-faint">{t("memoMoreLive")}</p>
          </div>

          {/* And what to do with it, once they have read it. Both lead OUT of the analysis
              rather than sitting above it. */}
          <div className="mt-6 border-t-2 border-line pt-5">
            <h3 className="font-display text-[17px] font-black text-ink">{t("memoNextTitle")}</h3>
            <div className="mt-3 flex flex-wrap gap-3">
              {(applyDraft || noLetterForPath) && (
                <a href="#r-apply" className="btn btn-secondary">
                  {t("memoNextLetter")}
                </a>
              )}
              <button type="button" onClick={() => goView("help")} className="btn btn-secondary">
                {t("memoNextHuman")}
              </button>
            </div>
          </div>
        </section>
      )}

      {view === "memo" && (
      <details id="r-reasons" data-tour="reasons" className="card">
        <summary className="cursor-pointer list-none">
          {/* The heading lives INSIDE the summary rather than being repeated as a hidden
              one: a screen reader should meet this section once, as the control that opens
              it, not twice with one copy invisible. */}
          <h2 className="font-display text-[21px] font-black text-ink">{t("reasonsTitle")}</h2>
          <span className="mt-1 block text-[15px] leading-snug text-ink-faint">{t("reasonsDisclose")}</span>
        </summary>
        <div className="mt-4">
        <p className="mt-2 text-[15.5px] leading-relaxed text-ink-soft">{t("reasonsLead")}</p>
        {/* Anything about the clock is amber and calm — same rule as the time-limit line. */}
        <div className="mt-4 rounded-sticker border-2 border-amber-border bg-amber-bg px-4 py-3">
          <p className="font-display text-[13px] font-black uppercase tracking-[0.1em] text-amber-ink">
            {t("reasonsClockTitle")}
          </p>
          <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-soft">{REASONS_CLOCK_WARNING}</p>
        </div>
        <LetterView body={template} label={t("reasonsTitle")} />
        <LetterPlaceholderKey text={t("letterPlaceholderKey")} />
        <button type="button" onClick={copyTemplate} className="btn btn-secondary mt-4">
          {copied ? t("reasonsCopied") : t("reasonsCopy")}
        </button>
        </div>
      </details>
      )}

      {/* Grounds people raise — in-flow, neutral; selection flows into the hand-off */}
      {/* Nothing to raise until an approach is chosen: the points differ completely between
          the two, so asking before the choice means asking the wrong question. */}
      {view === "grounds" && !chosenPath && (
        <section className="card">
          <h2 className="font-display text-[21px] font-black text-ink">{t("pointsNeedPathTitle")}</h2>
          <p className="mt-2 text-[15.5px] leading-relaxed text-ink-soft">{t("pointsNeedPathLead")}</p>
          <button type="button" onClick={() => goView("options")} className="btn btn-primary mt-4">
            {t("pointsNeedPathCta")}
          </button>
        </section>
      )}

      {/* Merits review is not argued on grounds of review. It is argued on what the tribunal
          decides for this kind of decision — the criteria the supervising lawyer supplied per
          scheme. Same shape as the grounds below, different source, because the person is
          doing a different thing. */}
      {/* The heading follows the BODY, not the slot. For a Victorian fine this field holds
          the Magistrates' Court on election, and "What the tribunal decides" named a
          tribunal that is not in this person's plan at all. */}
      {view === "grounds" && chosenPath === "merits-review" && entry.mrCriteria.length > 0 && (
        <section id="r-grounds" className="card">
          <h2 className="font-display text-[21px] font-black text-ink">
            {t(meritsIsTribunal ? "criteriaTitle" : "criteriaTitleOther")}
          </h2>
          <p className="mt-2 text-[15.5px] leading-relaxed text-ink-soft">
            {t(meritsIsTribunal ? "criteriaLead" : "criteriaLeadOther")}
          </p>
          {pointsContext}
          {renderPoints(entry.mrCriteria, "cn")}
          <p className="mt-4 text-[14.5px] leading-snug text-ink-faint">{t("groundNotesPrivacy")}</p>
        </section>
      )}

      {/* Where the supervising lawyer supplied criteria for the internal reviewer, they are
          shown — for a Victorian fine those are the statutory review grounds, which is the
          most useful thing on this step. Where they did not, there is no invented checklist:
          our own entry says "the rules are different for every department, so there is no
          single answer about how it works". Either way the open box is there, because the
          reason a person wants another look is often not on any list. */}
      {view === "grounds" && chosenPath === "internal-review" && (
        <section id="r-grounds" className="card">
          <h2 className="font-display text-[21px] font-black text-ink">
            {t(internalCriteria.length > 0 ? "internalCriteriaTitle" : "internalAskTitle")}
          </h2>
          <p className="mt-2 text-[15.5px] leading-relaxed text-ink-soft">
            {t(internalCriteria.length > 0 ? "internalCriteriaLead" : "internalAskLead")}
          </p>
          {pointsContext}
          {renderPoints(internalCriteria, "icn")}
          <p className="mt-6 text-[15.5px] font-semibold leading-snug text-ink">{t("internalAskTitle")}</p>
          <textarea
            id="cn-internal"
            value={criteriaNotes[INTERNAL_NOTE_KEY] ?? ""}
            onChange={(e) => setCriteriaNotes((prev) => ({ ...prev, [INTERNAL_NOTE_KEY]: e.target.value }))}
            rows={5}
            placeholder={t("internalAskPlaceholder")}
            className="input mt-4 w-full"
          />
          <p className="mt-3 text-[14.5px] leading-snug text-ink-faint">{t("groundNotesPrivacy")}</p>
        </section>
      )}

      {view === "grounds" && chosenPath === "judicial-review" && shownGrounds.length > 0 && (
        <section id="r-grounds" data-tour="grounds" className="card">
          <h2 className="font-display text-[21px] font-black text-ink">{t("groundsTitle")}</h2>
          <p className="mt-2 text-[15.5px] leading-relaxed text-ink-soft">{t("groundsLead")}</p>
          {pointsContext}
          <div className="mt-5">
            <GroundsExplorer
              grounds={shownGrounds}
              selectable
              selected={relatedGrounds}
              onToggle={onToggleGround}
              linkBase="/learn/grounds"
            />
          </div>
          {/* One box per marked ground. This is the half that was missing: marking a ground
              said "this sounds like my situation" and gave the person nowhere to say what
              actually happened on it, so the memorandum set out the law on a point in
              nobody's words but ours. Only marked grounds get a box — an empty form of
              seventeen is a form nobody fills in. */}
          {relatedGrounds.length > 0 && (
            <div className="mt-6 space-y-4">
              <h3 className="font-display text-[17px] font-black text-ink">{t("groundNotesTitle")}</h3>
              <p className="text-[15.5px] leading-relaxed text-ink-soft">{t("groundNotesLead")}</p>
              {shownGrounds
                .filter((g) => relatedGrounds.includes(g.id))
                .map((g) => (
                  <div key={g.id}>
                    <label htmlFor={`gn-${g.id}`} className="block font-display text-[15.5px] font-extrabold text-ink">
                      {g.plainName}
                    </label>
                    <textarea
                      id={`gn-${g.id}`}
                      value={groundNotes[g.id] ?? ""}
                      onChange={(e) => setGroundNotes((prev) => ({ ...prev, [g.id]: e.target.value }))}
                      rows={3}
                      placeholder={t("groundNotesPlaceholder")}
                      className="input mt-1.5 w-full"
                    />
                  </div>
                ))}
              <p className="text-[14.5px] leading-snug text-ink-faint">{t("groundNotesPrivacy")}</p>
            </div>
          )}

          {/* Moved here from the very first view on 2026-09-10.
              It sat directly under the "tell us what happened" box, so the first thing a
              person saw after writing their account was a button offering to put it in a
              letter — before they had been told what their options were, and before they had
              marked a single point. It could not even work there: it slots the account under
              the points they marked, and nothing was marked yet. It belongs here, after the
              points exist and after they have had a chance to write against each one. */}
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

          <Link href="/learn/grounds" className="link-text mt-5 inline-flex min-h-[44px]">
            {t("groundsMore")}
          </Link>
        </section>
      )}

      {/* The structural layer, scoped to where the person is. These answer the questions that
          come AFTER "what went wrong" — what a court can actually give you, whether you are the
          right person to ask, and the free routes that exist alongside review. Kept as links
          rather than expanded inline: a result screen is already long, and someone who needs
          these will follow them. */}
      {view === "options" && shownConcepts.length > 0 && (
        <section id="r-concepts" className="card">
          <h2 className="font-display text-[21px] font-black text-ink">{t("conceptsTitle")}</h2>
          <p className="mt-2 text-[15.5px] leading-relaxed text-ink-soft">{t("conceptsLead")}</p>
          <ul className="mt-4 grid gap-2.5">
            {orderedConcepts.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/learn/how-review-fits-together/${c.id}`}
                  className="flex min-h-[44px] flex-col justify-center gap-0.5 rounded-card border-2 border-line bg-paper px-4 py-2.5 no-underline transition hover:shadow-lift"
                >
                  <span className="font-display text-[16px] font-black leading-snug text-ink">
                    {c.plainName}
                  </span>
                  <span className="text-[14.5px] leading-snug text-ink-soft">{c.oneLine}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Tell us what happened — one box, in their own words.
          The grounds they ticked above are the lead indicator: they decide which headings the
          letter is organised under. This text never leaves the device until they press the
          button below it. */}
      {view === "story" && (
        <section id="r-account" className="card">
          <h2 className="font-display text-[21px] font-black text-ink">{t("accountTitle")}</h2>
          <p className="mt-2 text-[15.5px] leading-relaxed text-ink-soft">{t("accountLead")}</p>

          {/* No admissions warning here, removed 2026-09-11 on the owner's instruction.
              It read "Some things can count against you if you write them down. If you are
              not sure whether to put something in, leave it out" — an amber box, before the
              person had typed a word, telling them to say less. This step is where they tell
              us what happened, and nothing they write here is sent anywhere; the whole point
              of asking is to have the full account to work from.

              The guard is not lost, it has moved to where it can act on something real:
              `letterSensitive` flags a specific line at the point it is about to go into a
              LETTER that an agency will read. That is a warning about one sentence they can
              see, not a chill on the whole account. */}

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

        </section>
      )}

      {/* Apply for review — one draft per path, chosen by the person. Built on-device from
          the corpus entry (pure function, no request), so the no-network promise holds. */}
      {/* Say when we deliberately hold no letter, instead of just not rendering the section.
          A person who chose the court election and finds nothing where the draft was cannot
          tell whether the app decided not to help or simply broke. */}
      {view === "memo" && noLetterForPath && (
        <section id="r-apply" className="card">
          <h2 className="font-display text-[21px] font-black text-ink">{t("applyTitle")}</h2>
          <p className="mt-2 text-[15.5px] leading-relaxed text-ink-soft">{t("applyNoDraft")}</p>
          <button type="button" onClick={() => goView("help")} className="btn btn-primary mt-4">
            {t("applyNoDraftCta")}
          </button>
        </section>
      )}

      {view === "memo" && applyDraft && activeApply && (
        <section id="r-apply" data-tour="apply" className="card">
          <h2 className="font-display text-[21px] font-black text-ink">{t("applyTitle")}</h2>
          <p className="mt-2 text-[15.5px] leading-relaxed text-ink-soft">
            {chosenPath ? t("applyLeadChosen") : t("applyLead")}
          </p>

          {offeredApply.length > 1 && (
            <div role="group" aria-label={t("applyTitle")} className="mt-4 flex flex-wrap gap-2.5">
              {offeredApply.map((k) => {
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

          <LetterView body={applyDraft.body} label={activeApply.label} />
          <LetterPlaceholderKey text={t("letterPlaceholderKey")} />
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
      {view === "memo" && faqs.length > 0 && (
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

      {/* Move between the six views.
          Continue used to be enabled unconditionally, so a person could walk from "tell us
          what happened" to "what you want" having written nothing, and the steps behind them
          did nothing. The two steps that FEED everything downstream now ask to be answered:
          the account is what the letter and the memo are built from, and the goal is what
          orders the paths. Neither is a high bar — the goal step has "I am not sure" as a
          real answer, so nobody is trapped by not knowing.

          The later steps are NOT gated. The points are optional by design: someone who only
          wants to see their options should not have to argue a case first, and the memo
          composes perfectly well from the account alone. */}
      {view !== "help" && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {viewIdx > 0 ? (
            <button
              type="button"
              onClick={() => goView(RESULT_VIEWS[viewIdx - 1]!)}
              className="btn btn-secondary"
            >
              {t("viewBack")}
            </button>
          ) : (
            <span />
          )}
          <div className="flex flex-col items-end gap-1.5">
            {nextBlockedReason && (
              <p id="r-next-why" className="text-[14.5px] leading-snug text-ink-faint">
                {nextBlockedReason}
              </p>
            )}
            <button
              type="button"
              disabled={!!nextBlockedReason}
              aria-describedby={nextBlockedReason ? "r-next-why" : undefined}
              onClick={() => goView(RESULT_VIEWS[viewIdx + 1]!)}
              className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t(`viewNext_${view}`)}
            </button>
          </div>
        </div>
      )}

      {/* The one foil on this screen (max one per page): the hand-over.

          It does not RECOMMEND going to a service — it is one of the options, and which to
          take is the person's. The app names what each option is and leaves the choice
          alone, which is the same rule the result cards follow.

          This block and the help list under it used to render on EVERY view, so the first
          thing a person saw after telling us their situation was "take this to a human
          service" and a list of phone numbers — before we had told them anything. They came
          here for guidance. The hand-over is the step AFTER the guidance, so it lives on the
          last view with the rest of the routing. */}
      {view === "help" && (
      <section
        id="r-handoff"
        data-tour="handoff"
        className="foil sticker"
        style={{ "--rot": "0.8deg" } as React.CSSProperties}
      >
        <div className="foil-inner">
          <h2 className="font-display text-[21px] font-black text-ink">{t("handoffTitle")}</h2>
          <p className="mt-2 text-[15.5px] leading-relaxed text-ink-soft">{t("handoffLead")}</p>
          {/* The summary, on screen, not just behind a download. It is the SAME memo as the
              step before: this used to hand over a second, thinner document built by
              lib/handoff, so a person arrived at a legal service with a different paper from
              the one the app had just walked them through. And offering it only as a file
              meant someone on a phone with no easy way to open a .txt had nothing to read. */}
          <div data-memo={memo.body}>
            <MemoView blocks={memo.blocks} />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="btn btn-help"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(memo.body);
                  setMemoCopied(true);
                  setTimeout(() => setMemoCopied(false), 2000);
                } catch {
                  /* clipboard unavailable — the text is selectable */
                }
              }}
            >
              {memoCopied ? t("memoCopied") : t("memoCopy")}
            </button>
            <button type="button" onClick={downloadMemo} className="btn btn-secondary">
              {t("handoffDownload")}
            </button>
          </div>
        </div>
      </section>
      )}

      {view === "help" && <HelpList t={t} entry={entry} />}
    </div>
  );
}

/**
 * The escalation block. `compact` is the same services in a quieter frame, used high on the
 * options view so a person reaches a phone number before an explainer; the full block still
 * closes the page. Compact drops the sticker tilt and takes its own heading, so the two are
 * not two identical landmarks on one screen.
 */
function HelpList({
  t,
  entry,
  compact = false,
}: {
  t: ReturnType<typeof useTranslations>;
  entry: DataPathway;
  compact?: boolean;
}) {
  return (
    <section
      className={
        compact
          ? "rounded-card border-2 border-help bg-help-soft p-5"
          : "sticker rounded-card border-2 border-help bg-help-soft p-5 sm:p-6"
      }
      style={compact ? undefined : ({ "--rot": "-0.7deg" } as React.CSSProperties)}
    >
      <h2
        className={`font-display font-black text-help-ink ${compact ? "text-[19px]" : "text-[21px]"}`}
      >
        {compact ? t("helpFirstTitle") : t("helpTitle")}
      </h2>
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
