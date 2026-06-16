import { LocalSessionSchema, STORAGE_KEY, type LocalSession } from "@/lib/schemas/storage";

/**
 * localStorage adapter (TECHNICAL_SPEC §4). The ONLY client state; single-device.
 * Zod-validated on read so a corrupt/old value can never crash the app. Nothing here
 * leaves the device — there is no server-side persistence of any of it.
 */

const EMPTY: LocalSession = { version: 1, locale: "en" };

export function loadSession(): LocalSession {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = LocalSessionSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : EMPTY;
  } catch {
    return EMPTY;
  }
}

export function saveSession(patch: Partial<LocalSession>): LocalSession {
  if (typeof window === "undefined") return EMPTY;
  const next = LocalSessionSchema.parse({ ...loadSession(), ...patch, version: 1 });
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full / disabled — non-fatal; the app still works for the session.
  }
  return next;
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
