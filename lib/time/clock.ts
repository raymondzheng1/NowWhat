/**
 * Injectable clock (harness §4.4). All time-dependent logic (deadline math, daily
 * budget keys, rate-limit windows) routes through now() so it's unit-testable with a
 * pinned clock. DEV_FAKE_NOW drives demos; it is IGNORED in production (fail-loud).
 */

let testNow: number | null = null;

export function __setNowForTests(ms: number | null): void {
  testNow = ms;
}

export function now(): Date {
  if (testNow !== null) return new Date(testNow);
  const fake = process.env.DEV_FAKE_NOW;
  if (fake && process.env.NODE_ENV !== "production") {
    const d = new Date(fake);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

/** UTC YYYY-MM-DD for `now()` — used for the global daily budget key. */
export function todayUtc(): string {
  return now().toISOString().slice(0, 10);
}

/**
 * The person's own calendar date, YYYY-MM-DD, for anything they see or pick. The UTC date is
 * yesterday in Melbourne until 10 or 11 in the morning, so a letter dated today could not be
 * picked, and a memo prepared this morning was stamped with yesterday.
 */
export function todayLocal(): string {
  const d = now();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
