/**
 * App-wide constants — single source of truth (harness §3.3).
 * Never hardcode these values elsewhere; import from here.
 */

/**
 * Read a dollar amount from the environment.
 *
 * `Number(process.env.X ?? "5")` looks equivalent and is not, because `??` only catches a
 * variable that is UNSET. Two things a person does while wiring up a hosting dashboard both
 * get through it, and both are silent:
 *
 *   · A variable CREATED AND LEFT BLANK is the empty string, not undefined. `Number("")`
 *     is 0, and the guard compares `spent >= cap` — so a blank box denies every model call
 *     from the first request of the day, and the visitor is told we have reached today's
 *     limit. On day one. With nothing spent.
 *   · A value written the way people write money — "$50", "50 USD" — is `NaN`, and
 *     `spent >= NaN` is false forever. The kill switch never fires. That is the failure that
 *     costs money rather than availability.
 *
 * So: blank means unset, a value that is not a real number falls back to the default rather
 * than becoming it, and an explicit `0` is honoured — that one is deliberate, and it is the
 * only way to switch model spend off without a redeploy. `/api/health` reports what actually
 * took effect, so a typo is visible from outside instead of being inferred from behaviour.
 */
function usdFromEnv(raw: string | undefined, fallback: number): number {
  const s = (raw ?? "").trim();
  if (s === "") return fallback;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** Hard per-session model-spend cap in USD (PRD §6.9). Overridable by env. */
export const SESSION_CAP_USD = usdFromEnv(process.env.SESSION_CAP_USD, 5);

/** Global daily budget kill-switch in USD. */
export const GLOBAL_DAILY_BUDGET_USD = usdFromEnv(
  process.env.GLOBAL_DAILY_BUDGET_USD,
  50,
);

/** Per-IP request ceiling per rolling window (rate limit, fail-closed). */
export const IP_RATE_LIMIT = { max: 30, windowSeconds: 60 * 60 } as const;

/**
 * Anthropic models (server-side only). Big model for grounded answers,
 * small model for structural envelope repair (harness §11).
 */
export const MODELS = {
  // The grounded-answer model. Overridable via env so the primary model can be tuned
  // (e.g. Sonnet vs Opus vs Haiku) without a code change — handy while A/B testing the
  // LLM answers against the keyless wizard.
  primary: process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-5",
  // Small model for structural envelope repair only (never substance, harness §11).
  small: "claude-haiku-4-5-20251001",
};

/** Per-1M-token prices (USD) used by the cost meter. Update on model change. */
export const MODEL_PRICES_USD_PER_MTOK: Record<
  string,
  { input: number; output: number }
> = {
  "claude-opus-5": { input: 15, output: 75 },
  "claude-sonnet-5": { input: 3, output: 15 },
  "claude-haiku-4-5-20251001": { input: 1, output: 5 },
};

/** Plain-language target. Year-6 ideal; hard-fail above the ceiling (PRD §4). */
export const READING_GRADE = { ideal: 9, ceiling: 11 } as const;

/** Months after which a corpus entry's lastVerified is considered stale. */
export const CORPUS_STALE_MONTHS = 6;

/** Max regeneration attempts before falling back to "not covered" (TECHNICAL_SPEC §6). */
export const MAX_GENERATION_ATTEMPTS = 3;

/** Supported locales (harness §10; English first). */
export const LOCALES = ["en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

/** Canonical, normalised base URL (harness §8, §2.2). */
export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

/**
 * The disclaimer that must appear on every customer-facing answer surface and
 * FAQ page (harness §9.3 — a product constant that can never be removed).
 *
 * Widened on 2026-08-23 after external legal review. The old sentence covered advice and
 * prediction; it said nothing about the two things that actually cost people a right — that
 * we never choose between the options we show them, and that a time limit is running while
 * they read. Both are now stated here, so the promise travels with the constant rather than
 * depending on which surface the person happens to be on. The reviewer's wording used
 * "obtain help" and "promptly"; both are swapped for plainer words. Short sentences on
 * purpose: this renders to someone in distress, on a phone.
 *
 * The footer keeps its own shorter variant — this one is four sentences and does not fit
 * there. Do not merge them.
 */
export const DISCLAIMER =
  "This is general information, not legal advice. It does not tell you what will happen in your case, and it does not choose an option for you. Time limits depend on your decision and can be short. Check your letter, and get help from the official body or a free legal service as soon as you can.";

/** Product name SoT (no AI/LLM mentions in customer copy — harness §11). */
export const PRODUCT_NAME = "Now What?";
export const PRODUCT_TAGLINE = "Your rights when government says no";
