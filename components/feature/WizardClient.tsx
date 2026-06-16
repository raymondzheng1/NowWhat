"use client";

import { useState } from "react";
import Link from "next/link";
import type { EntrySummary } from "@/lib/corpus/summary";
import { postClassify } from "@/components/feature/api";
import { ResultView } from "@/components/feature/ResultView";
import { NotCovered } from "@/components/feature/NotCovered";
import { Crest } from "@/components/ui/Wordmark";
import { PrivacyNote } from "@/components/ui/PrivacyNote";
import { Icon, type IconName } from "@/components/ui/icons";

type Step = "choose" | "paste" | "details" | "result" | "not-covered";

const CARD: Record<string, { label: string; desc: string; icon: IconName }> = {
  "vic-renting": { label: "Renting / notice to vacate", desc: "Eviction, rent increase, repairs, bond.", icon: "House" },
  "vic-fines": { label: "Fines & infringements", desc: "Parking, tolls, public transport, council.", icon: "Receipt" },
  "vic-public-housing": { label: "Public & community housing", desc: "A decision from your housing provider.", icon: "Apartments" },
  "vic-generic": { label: "A Victorian government decision", desc: "Any other state government ‘no’.", icon: "Document" },
};

export const CATEGORY: Record<string, string> = {
  "vic-renting": "Renting · Notice to vacate",
  "vic-fines": "Fines · Infringements",
  "vic-public-housing": "Public & community housing",
  "vic-generic": "Victorian government decision",
};

function categoryFor(e: EntrySummary): string {
  return CATEGORY[e.id] ?? e.title;
}

function IconWell({ name, active }: { name: IconName; active: boolean }) {
  const Glyph = Icon[name];
  return (
    <span
      className={`flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-icon sm:h-[52px] sm:w-[52px] ${
        active ? "bg-navy-soft" : "bg-[#f4f5f7]"
      }`}
    >
      <Glyph className="h-[24px] w-[24px] text-navy sm:h-[27px] sm:w-[27px]" strokeWidth={1.7} />
    </span>
  );
}

export function WizardClient({ entries }: { entries: EntrySummary[] }) {
  const generic = entries.find((e) => e.id === "vic-generic");

  const [step, setStep] = useState<Step>("choose");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<EntrySummary | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const [decisionDate, setDecisionDate] = useState("");
  const [note, setNote] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [classifying, setClassifying] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const pct = step === "details" ? 66 : 100; // choose/paste = 33 (set below)
  const progress = step === "choose" || step === "paste" ? 33 : pct;
  const stepNo = step === "details" ? 2 : 1;
  const stepTitle = step === "details" ? "Your details" : "About your decision";

  function reset() {
    setStep("choose");
    setSelectedId(null);
    setSelected(null);
    setIsFallback(false);
    setDecisionDate("");
    setNote("");
    setPasteText("");
  }

  function continueFromChoose() {
    const e = entries.find((x) => x.id === selectedId);
    if (!e) return;
    setSelected(e);
    setIsFallback(e.id === "vic-generic");
    setStep("details");
  }

  async function classifyPasted() {
    if (pasteText.trim().length < 5) return;
    setClassifying(true);
    const r = await postClassify(pasteText.trim());
    setClassifying(false);
    if (r.ok && r.status === "matched") {
      const e = entries.find((x) => x.id === r.entryId) ?? generic ?? null;
      setSelected(e);
      setIsFallback(r.isFallback || e?.id === "vic-generic");
      setStep(e ? "details" : "not-covered");
    } else {
      setStep("not-covered");
    }
  }

  // --- Step 3: the Result is its own focused screen (own header / Start over). ---
  if (step === "result" && selected) {
    return (
      <ResultView
        entry={selected}
        category={categoryFor(selected)}
        answer={selected.reviewable.basis}
        about={selected.plainLanguageExplainer}
        decisionDate={decisionDate || undefined}
        isFallback={isFallback}
      />
    );
  }

  // --- The wizard shell (steps 1–2 + not-covered) ---
  const continueDisabled =
    (step === "choose" && !selectedId) || (step === "paste" && pasteText.trim().length < 5);

  function onContinue() {
    if (step === "choose") continueFromChoose();
    else if (step === "paste") void classifyPasted();
    else if (step === "details") setStep("result");
  }

  function onBack() {
    if (step === "paste") setStep("choose");
    else if (step === "details") setStep("choose");
    else if (step === "not-covered") setStep("choose");
  }

  return (
    <div className="min-h-screen">
      {/* Wizard header — progress + close */}
      <header className="border-b border-line bg-paper px-[18px] py-3.5 sm:px-10 sm:py-5">
        <div className="flex items-center justify-between gap-4">
          <span className="hidden sm:block">
            <Link href="/" aria-label="Home" className="inline-flex items-center gap-2.5">
              <Crest size={30} />
              <span className="font-serif text-[16px] font-bold text-ink">
                What Now<span className="text-brass-q">?</span>
              </span>
            </Link>
          </span>
          <span className="text-[13px] font-bold text-navy sm:hidden">Step {stepNo} of 3</span>

          {/* Desktop progress */}
          <div className="mx-8 hidden max-w-[360px] flex-1 flex-col sm:flex">
            <div className="mb-2 flex justify-between text-meta font-semibold text-ink-faint">
              <span className="text-navy">
                Step {stepNo} of 3 · {stepTitle}
              </span>
              <span>{progress}%</span>
            </div>
            <div className="h-[5px] bg-[#eceef1]">
              <div className="h-full bg-brass transition-[width] duration-200" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <Link
            href="/"
            aria-label="Close and return home"
            className="flex h-9 w-9 items-center justify-center rounded-button border border-line text-ink-faint sm:h-11 sm:w-11"
          >
            <Icon.Close className="h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={2} />
          </Link>
        </div>
        {/* Mobile progress track */}
        <div className="mt-3 h-[5px] bg-[#eceef1] sm:hidden">
          <div className="h-full bg-brass transition-[width] duration-200" style={{ width: `${progress}%` }} />
        </div>
      </header>

      {/* Body */}
      <div className="bg-paper-warm px-[18px] py-7 sm:px-10 sm:py-14">
        <div key={step} className="wn-step mx-auto max-w-[780px]">
          {step === "choose" && (
            <>
              <h1 className="text-center font-serif text-[23px] font-bold text-navy-ink sm:text-h1">
                What is your decision about?
              </h1>
              <p className="mt-2 text-center text-[14.5px] text-ink-soft sm:text-[16.5px]">
                Pick the closest one. You can change it later.
              </p>
              <div className="mt-6 grid gap-3 sm:mt-9 sm:grid-cols-2 sm:gap-4">
                {entries.map((e) => {
                  const meta = CARD[e.id] ?? { label: e.title, desc: "", icon: "Document" as IconName };
                  const active = selectedId === e.id;
                  return (
                    <button
                      key={e.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSelectedId(e.id)}
                      className={`flex items-center gap-4 rounded-card bg-paper p-4 text-left transition-all sm:p-[22px] ${
                        active
                          ? "border-[1.5px] border-navy shadow-raised"
                          : "border-[1.5px] border-line-card hover:border-navy/40"
                      }`}
                    >
                      <IconWell name={meta.icon} active={active} />
                      <span>
                        <span className="block font-serif text-[15.5px] font-bold text-ink sm:text-[18px]">
                          {meta.label}
                        </span>
                        <span className="mt-0.5 block text-[13px] leading-snug text-ink-soft sm:text-sm">
                          {meta.desc}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setStep("paste")}
                className="mt-3 flex w-full items-center justify-center gap-3 rounded-card border-[1.5px] border-dashed border-[#c3cad3] bg-paper px-5 py-4 text-[14px] text-ink-soft sm:mt-4 sm:text-[15.5px]"
              >
                <Icon.Paste className="h-[20px] w-[20px] text-ink-faint" strokeWidth={1.7} />
                None of these — <span className="font-semibold text-navy">let me paste my letter</span>
              </button>
            </>
          )}

          {step === "paste" && (
            <>
              <h1 className="font-serif text-[23px] font-bold text-navy-ink sm:text-h1">Paste your letter</h1>
              <p className="mt-2 text-[15px] text-ink-soft">
                Paste the words from your letter or decision. We read it on the spot to point you to
                the right guide — it is never stored.
              </p>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Paste the text of your letter here…"
                rows={9}
                className="input mt-4 leading-relaxed"
              />
              <p className="mt-3 text-sm text-ink-soft">
                Got a photo of the letter instead?{" "}
                <Link href="/decode" className="link font-semibold">
                  Scan or upload it →
                </Link>
              </p>
            </>
          )}

          {step === "details" && selected && (
            <>
              <h1 className="font-serif text-[23px] font-bold text-navy-ink sm:text-h1">
                A couple of details
              </h1>
              <p className="mt-2 text-[15px] text-ink-soft">
                These help us work out your dates. Skip anything you&rsquo;re unsure of.
              </p>
              <div className="mt-6 space-y-5">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-ink">
                    What date is on your notice or decision?
                  </span>
                  <input
                    type="date"
                    max={today}
                    value={decisionDate}
                    onChange={(e) => setDecisionDate(e.target.value)}
                    className="input sm:w-auto"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-ink">
                    Anything you want to add? (optional)
                  </span>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="In your own words…"
                    rows={3}
                    className="input leading-relaxed"
                  />
                </label>
                <PrivacyNote>What you type here is never stored.</PrivacyNote>
              </div>
            </>
          )}

          {step === "not-covered" && (
            <NotCovered
              title="We're not sure about this one"
              body="We couldn't match this to a guide we can stand behind. Rather than guess, here are free services that can help with your situation."
              services={generic?.getHelp ?? []}
            />
          )}

          {/* Footer nav */}
          {step !== "not-covered" ? (
            <div className="mt-8 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={onBack}
                disabled={step === "choose"}
                className="inline-flex items-center gap-2 text-[15.5px] font-semibold text-ink-faint disabled:opacity-40"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={onContinue}
                disabled={continueDisabled || classifying}
                className="btn-primary btn-lg px-8 disabled:opacity-50"
              >
                {classifying ? "Reading…" : "Continue →"}
              </button>
            </div>
          ) : (
            <button onClick={reset} className="link mt-6 text-sm">
              Start over
            </button>
          )}

          <div className="mt-5 flex justify-center">
            <PrivacyNote center>Nothing you enter here is stored.</PrivacyNote>
          </div>
        </div>
      </div>
    </div>
  );
}
