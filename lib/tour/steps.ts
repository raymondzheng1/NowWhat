/**
 * Guided-walkthrough step definitions (harness §14.11).
 *
 * Module-level consts on purpose: an inline array has a fresh identity every render and
 * re-triggers the tour effect while the tour is open.
 *
 * Each step names a `data-tour` anchor (attributes survive refactors; class selectors don't)
 * and two i18n keys under `tour.*`. Copy lives in the message catalog so it passes through
 * the same no-advice / no-AI / reading-level linters as every other customer-facing string —
 * a walkthrough is customer copy, and on this product that is a safety surface.
 */

export interface TourStepDef {
  /** Value of the target's data-tour attribute. */
  el: string;
  /** i18n keys under the `tour` namespace. */
  titleKey: string;
  textKey: string;
}

/** localStorage kill-switch so automated runs never fight a modal overlay (harness §14.5). */
export const TOUR_OFF_KEY = "wn:tour:off";
export const tourFlagKey = (id: string) => `wn:tour:${id}:v1`;

/** Every tour id, so "replay the guides" can clear them all. */
export const TOUR_IDS = ["start-who", "start-what", "start-result", "ask", "decode"] as const;
export type TourId = (typeof TOUR_IDS)[number];

// --- /start, step 1: who made the decision -----------------------------------------
export const TOUR_START_WHO: TourStepDef[] = [
  { el: "who-options", titleKey: "whoOptionsTitle", textKey: "whoOptionsText" },
  { el: "privacy-note", titleKey: "privacyTitle", textKey: "privacyText" },
];

// --- /start, step 2: what the decision is about --------------------------------------
export const TOUR_START_WHAT: TourStepDef[] = [
  { el: "area-cards", titleKey: "areaTitle", textKey: "areaText" },
  { el: "decision-date", titleKey: "dateTitle", textKey: "dateText" },
  { el: "tripwire", titleKey: "tripwireTitle", textKey: "tripwireText" },
  { el: "consent", titleKey: "consentTitle", textKey: "consentText" },
];

// --- /start, step 3: the result ------------------------------------------------------
export const TOUR_START_RESULT: TourStepDef[] = [
  { el: "avenue", titleKey: "avenueTitle", textKey: "avenueText" },
  { el: "reasons", titleKey: "reasonsTitle", textKey: "reasonsText" },
  { el: "grounds", titleKey: "groundsTitle", textKey: "groundsText" },
  { el: "handoff", titleKey: "handoffTitle", textKey: "handoffText" },
];

// --- /ask ----------------------------------------------------------------------------
export const TOUR_ASK: TourStepDef[] = [
  { el: "ask-input", titleKey: "askInputTitle", textKey: "askInputText" },
  { el: "ask-submit", titleKey: "askSubmitTitle", textKey: "askSubmitText" },
];

// --- /decode -------------------------------------------------------------------------
export const TOUR_DECODE: TourStepDef[] = [
  { el: "decode-upload", titleKey: "decodeUploadTitle", textKey: "decodeUploadText" },
  { el: "decode-paste", titleKey: "decodePasteTitle", textKey: "decodePasteText" },
  { el: "decode-privacy", titleKey: "decodePrivacyTitle", textKey: "decodePrivacyText" },
];
