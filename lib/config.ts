/**
 * App-wide constants — single source of truth (harness §3.3).
 * Never hardcode these values elsewhere; import from here.
 */

/** Hard per-session model-spend cap in USD (PRD §6.9). Overridable by env. */
export const SESSION_CAP_USD = Number(process.env.SESSION_CAP_USD ?? "5");

/** Global daily budget kill-switch in USD. */
export const GLOBAL_DAILY_BUDGET_USD = Number(
  process.env.GLOBAL_DAILY_BUDGET_USD ?? "50",
);

/** Per-IP request ceiling per rolling window (rate limit, fail-closed). */
export const IP_RATE_LIMIT = { max: 30, windowSeconds: 60 * 60 } as const;

/**
 * Anthropic models (server-side only). Big model for grounded answers,
 * small model for structural envelope repair (harness §11).
 */
export const MODELS = {
  primary: "claude-sonnet-4-6",
  small: "claude-haiku-4-5-20251001",
} as const;

/** Per-1M-token prices (USD) used by the cost meter. Update on model change. */
export const MODEL_PRICES_USD_PER_MTOK: Record<
  string,
  { input: number; output: number }
> = {
  "claude-sonnet-4-6": { input: 3, output: 15 },
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
 */
export const DISCLAIMER =
  "This is general information, not legal advice, and we cannot tell you what will happen in your case. For advice about your situation, talk to a free legal service.";

/** Product name SoT (no AI/LLM mentions in customer copy — harness §11). */
export const PRODUCT_NAME = "What Now?";
export const PRODUCT_TAGLINE = "Your rights when government says no";
