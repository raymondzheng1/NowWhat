/**
 * When to offer installation — pure decisions, no DOM writes, so they are testable.
 *
 * The bar for showing this is high. Our audience is stressed, often on a borrowed or
 * low-end phone, and an install card competes for attention with the one thing that
 * matters: the route to a free legal service. So we ask once, late, and never again.
 */

/** Set by the e2e harness, exactly like `wn:tour:off`. */
export const INSTALL_OFF_KEY = "wn:install:off";
/** Set when the person dismisses the card, or installs. One dismissal is permanent. */
export const INSTALL_DISMISSED_KEY = "wn:install:dismissed";

export type InstallMode = "prompt" | "ios-instructions" | "none";

export interface InstallEnv {
  /** True when a `beforeinstallprompt` event has been captured and is still usable. */
  hasDeferredPrompt: boolean;
  /** Already running as an installed app. */
  isStandalone: boolean;
  /** iOS Safari, which never fires `beforeinstallprompt`. */
  isIos: boolean;
  dismissed: boolean;
  suppressed: boolean;
}

/**
 * `beforeinstallprompt` is Chromium-only. On iOS the only route is Share → Add to Home
 * Screen, so that platform gets instructions instead of a button. Anything already
 * installed, dismissed or suppressed gets nothing.
 */
export function installMode(env: InstallEnv): InstallMode {
  if (env.suppressed || env.dismissed || env.isStandalone) return "none";
  if (env.hasDeferredPrompt) return "prompt";
  if (env.isIos) return "ios-instructions";
  return "none";
}

/** iPhone/iPod report plainly; iPadOS 13+ masquerades as a Mac but has a touch screen. */
export function detectIos(ua: string, maxTouchPoints: number, hasTouchEvent: boolean): boolean {
  if (/iPhone|iPod|iPad/i.test(ua)) return true;
  return /Macintosh/i.test(ua) && maxTouchPoints > 1 && hasTouchEvent;
}

/**
 * Where the card may appear.
 *
 * Never inside the focused tools. On /start, /ask and /decode the person is mid-task, and
 * on /help they are trying to reach a human — interrupting either to advertise ourselves
 * would be indefensible.
 */
export function pathAllowsInstallCard(pathname: string): boolean {
  return !/^\/(start|ask|decode|chat|help)(\/|$)/.test(pathname);
}
