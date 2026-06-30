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

const FLAG_KEYS: { key: keyof TripwireFlags; label: string }[] = [
  { key: "family", label: "flagFamily" },
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

  return (
    <div className="min-h-screen">
      <FocusedHeader stepNo={stepNo} t={t} onReset={step === "result" ? reset : undefined} />

      <div className="bg-sand px-[22px] py-7 sm:px-10 sm:py-12">
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

          <div className="mt-6 flex justify-center">
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
}: {
  stepNo: number;
  t: ReturnType<typeof useTranslations>;
  onReset?: () => void;
}) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-line bg-sand-surface px-[22px] py-3.5 sm:px-10 sm:py-4">
      <Link href="/" aria-label="Home" className="inline-flex items-center gap-2.5">
        <Crest size={30} />
        <span className="hidden font-display text-[16px] font-semibold text-ink sm:inline">
          What Now<span className="text-accent">?</span>
        </span>
      </Link>
      <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-soft">
        {t("stepOf", { n: stepNo })}
      </span>
      <div className="flex items-center gap-2">
        {onReset && (
          <button type="button" onClick={onReset} className="text-[13px] font-semibold text-accent hover:text-ink">
            {t("startOver")}
          </button>
        )}
        <Link
          href="/"
          aria-label={t("close")}
          className="flex h-9 w-9 items-center justify-center rounded-button border border-line text-ink-faint"
        >
          <Icon.Close className="h-4 w-4" strokeWidth={2} />
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
    { j: "Vic", title: t("whoVic"), desc: t("whoVicDesc") },
    { j: "Cth", title: t("whoCth"), desc: t("whoCthDesc") },
  ];
  return (
    <>
      <h1 className="font-display text-[26px] font-semibold text-ink sm:text-[34px]">{t("whoTitle")}</h1>
      <p className="mt-2 text-[15px] text-ink-soft">{t("whoHelp")}</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 sm:gap-4">
        {opts.map((o) => (
          <button
            key={o.j}
            type="button"
            onClick={() => onPick(o.j)}
            className="rounded-card border-[1.5px] border-line bg-paper p-5 text-left transition-colors hover:border-rail sm:p-6"
          >
            <span className="block font-display text-[19px] font-bold text-ink">{o.title}</span>
            <span className="mt-1 block text-[14px] leading-snug text-ink-soft">{o.desc}</span>
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
      <h1 className="font-display text-[26px] font-semibold text-ink sm:text-[34px]">{t("whatTitle")}</h1>
      <p className="mt-2 text-[15px] text-ink-soft">{t("whatHelp")}</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {areas.map((e) => {
          const Glyph = Icon[AREA_ICON[e.id] ?? "Document"];
          const active = areaId === e.id;
          return (
            <button
              key={e.id}
              type="button"
              aria-pressed={active}
              onClick={() => setAreaId(e.id)}
              className={`flex items-center gap-3.5 rounded-card bg-paper p-4 text-left transition-colors sm:p-5 ${
                active ? "border-[1.5px] border-rail shadow-raised" : "border-[1.5px] border-line hover:border-rail/40"
              }`}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-icon bg-sand">
                <Glyph className="h-6 w-6 text-rail" strokeWidth={1.7} />
              </span>
              <span className="font-display text-[16px] font-bold text-ink">{e.title}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 space-y-5">
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-ink">{t("dateLabel")}</span>
          <input
            type="date"
            max={today}
            value={decisionDate}
            onChange={(e) => setDecisionDate(e.target.value)}
            className="input sm:w-auto"
          />
        </label>

        <fieldset className="rounded-card border border-line bg-paper p-4 sm:p-5">
          <legend className="px-1 font-display text-[16px] font-bold text-ink">{t("checkTitle")}</legend>
          <p className="mt-1 text-[13px] text-ink-soft">{t("checkHelp")}</p>
          <div className="mt-3 space-y-2.5">
            {FLAG_KEYS.map(({ key, label }) => (
              <label key={key} className="flex items-start gap-2.5 text-[14px] text-ink">
                <input
                  type="checkbox"
                  checked={!!flags[key]}
                  onChange={(e) => setFlags({ ...flags, [key]: e.target.checked })}
                  className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-rail"
                />
                <span>{t(label)}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="flex items-start gap-2.5 rounded-card border border-line bg-paper p-4 text-[14px] text-ink">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-rail"
          />
          <span>{t("consent")}</span>
        </label>
      </div>

      <div className="mt-7 flex items-center justify-between gap-4">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-[15px] font-semibold text-ink-faint">
          ← {t("back")}
        </button>
        <button type="button" onClick={onContinue} disabled={!canContinue} className="btn-primary btn-lg px-8 disabled:opacity-50">
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
      <div>
        <Disclaimer className="mb-6" />
        <div className="rounded-card border-l-[3px] border-help bg-help-soft p-5 sm:p-6">
          <h1 className="font-display text-[24px] font-semibold text-help-ink">{t("routeTitle")}</h1>
          <p className="mt-2 text-[15px] text-help-ink">{t("routeBody")}</p>
          <ul className="mt-3 space-y-1.5 text-[14px] text-help-ink">
            {trip.reasons.map((r) => (
              <li key={r} className="flex gap-2">
                <span aria-hidden="true">•</span>
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
        <p className="text-[11px] uppercase tracking-[0.2em] text-accent">{t("resultEyebrow")}</p>
        <h1 className="mt-1 font-display text-[26px] font-semibold text-ink sm:text-[32px]">{entry.title}</h1>
      </div>
      <Disclaimer />
      {entry.isFallback && (
        <p className="rounded-card border border-line bg-sand-surface px-4 py-3 text-[13px] text-ink-soft">{t("fallbackNote")}</p>
      )}

      {/* Who can review this */}
      <section className="rounded-card border border-line bg-paper p-5 sm:p-6">
        <h2 className="font-display text-[20px] font-bold text-ink">{t("avenueTitle")}</h2>
        <ul className="mt-3 space-y-3">
          {av.mrAvailable && (
            <li>
              <p className="font-semibold text-ink">
                {t("avenueMR")} <span className="font-normal text-ink-soft">{t("via", { body: av.mrBody })}</span>
              </p>
              <p className="text-[14px] text-ink-soft">{t("avenueMRWhat")}</p>
            </li>
          )}
          {av.jrAvailable && (
            <li>
              <p className="font-semibold text-ink">
                {t("avenueJR")} <span className="font-normal text-ink-soft">{t("via", { body: av.jrForum })}</span>
              </p>
              <p className="text-[14px] text-ink-soft">{t("avenueJRWhat")}</p>
            </li>
          )}
          {!av.mrAvailable && !av.jrAvailable && <li className="text-[14px] text-ink-soft">{t("noReview")}</li>}
          {av.noReviewEndpoint && <li className="text-[14px] text-ink-soft">{av.noReviewEndpoint}</li>}
        </ul>
        {/* Time limits — brief + generic, part of the analysis (not a headline). No countdown. */}
        <p className="mt-4 flex items-start gap-2 border-t border-line/70 pt-3 text-[13px] leading-relaxed text-ink-soft">
          <Icon.Clock className="mt-[2px] h-4 w-4 shrink-0 text-ink-faint" strokeWidth={2} aria-hidden />
          <span>
            <span className="font-semibold text-ink">{t("deadlineTitle")}:</span> {dl.rule}{" "}
            {dl.sourceUrl && (
              <a href={dl.sourceUrl} target="_blank" rel="noopener noreferrer" className="link">
                {t("deadlineSource")}
              </a>
            )}
          </span>
        </p>
      </section>

      {/* Understand these options — in-flow Learn (progressive disclosure) */}
      {(av.mrAvailable || av.jrAvailable) && (
        <section className="rounded-card border border-line bg-paper p-5 sm:p-6">
          <h2 className="font-display text-[20px] font-bold text-ink">{t("learnTitle")}</h2>
          <p className="mt-2 text-[14.5px] text-ink-soft">{t("learnLead")}</p>
          <div className="mt-4 space-y-3">
            {av.mrAvailable && (
              <details className="rounded-card border border-line bg-sand-surface px-4 py-3">
                <summary className="cursor-pointer font-display text-[17px] font-semibold text-ink">
                  {meritsReview.name} — {meritsReview.plainName}
                </summary>
                <div className="mt-4">
                  <ProcessExplainer process={meritsReview} compact />
                </div>
              </details>
            )}
            {av.jrAvailable && (
              <details className="rounded-card border border-line bg-sand-surface px-4 py-3">
                <summary className="cursor-pointer font-display text-[17px] font-semibold text-ink">
                  {judicialReview.name} — {judicialReview.plainName}
                </summary>
                <div className="mt-4">
                  <ProcessExplainer process={judicialReview} compact />
                </div>
              </details>
            )}
          </div>
          <Link href="/learn" className="link-text mt-4 inline-block">{t("learnMore")}</Link>
        </section>
      )}

      {/* Ask for the reasons */}
      <section className="rounded-card border border-line bg-paper p-5 sm:p-6">
        <h2 className="font-display text-[20px] font-bold text-ink">{t("reasonsTitle")}</h2>
        <p className="mt-2 text-[14.5px] text-ink-soft">{t("reasonsLead")}</p>
        <div className="mt-3 rounded-card border-l-[3px] border-gold bg-gold-soft px-4 py-3">
          <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-gold">{t("reasonsClockTitle")}</p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-ink-soft">{REASONS_CLOCK_WARNING}</p>
        </div>
        <textarea
          readOnly
          value={template}
          rows={12}
          className="input mt-4 font-mono text-[13px] leading-relaxed"
          aria-label={t("reasonsTitle")}
        />
        <button type="button" onClick={copyTemplate} className="btn-secondary mt-3">
          {copied ? t("reasonsCopied") : t("reasonsCopy")}
        </button>
      </section>

      {/* Grounds people raise — in-flow, neutral; selection flows into the hand-off */}
      {av.jrAvailable && jrGrounds.length > 0 && (
        <section className="rounded-card border border-line bg-paper p-5 sm:p-6">
          <h2 className="font-display text-[20px] font-bold text-ink">{t("groundsTitle")}</h2>
          <p className="mt-2 text-[14.5px] leading-relaxed text-ink-soft">{t("groundsLead")}</p>
          <div className="mt-4">
            <GroundsExplorer
              grounds={jrGrounds}
              selectable
              selected={relatedGrounds}
              onToggle={onToggleGround}
              linkBase="/learn/grounds"
            />
          </div>
          <Link href="/learn/grounds" className="link-text mt-4 inline-block">{t("groundsMore")}</Link>
        </section>
      )}

      {/* Hand-off + help */}
      <section className="rounded-card border border-line bg-paper p-5 sm:p-6">
        <h2 className="font-display text-[20px] font-bold text-ink">{t("handoffTitle")}</h2>
        <p className="mt-2 text-[14.5px] text-ink-soft">{t("handoffLead")}</p>
        <button type="button" onClick={downloadHandoff} className="btn-help mt-3">
          {t("handoffDownload")}
        </button>
      </section>

      <HelpList t={t} entry={entry} />
    </div>
  );
}

function HelpList({ t, entry }: { t: ReturnType<typeof useTranslations>; entry: DataPathway }) {
  return (
    <section className="rounded-card border-l-[3px] border-help bg-help-soft p-5 sm:p-6">
      <h2 className="font-display text-[20px] font-bold text-help-ink">{t("helpTitle")}</h2>
      <ul className="mt-3 space-y-2">
        {entry.getHelp.map((h) => (
          <li key={h.service}>
            <a href={h.link} target="_blank" rel="noopener noreferrer" className="font-semibold text-help-ink underline underline-offset-2">
              {h.service}
            </a>
          </li>
        ))}
      </ul>
      <Link href="/help" className="mt-3 inline-block text-[13px] font-semibold uppercase tracking-[0.1em] text-help-ink">
        {t("helpMore")} →
      </Link>
    </section>
  );
}
