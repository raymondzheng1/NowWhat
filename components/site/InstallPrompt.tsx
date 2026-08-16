"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icons";
import {
  INSTALL_DISMISSED_KEY,
  INSTALL_OFF_KEY,
  detectIos,
  installMode,
  pathAllowsInstallCard,
  type InstallMode,
} from "@/lib/pwa/install";

/**
 * The "keep this on your phone" card.
 *
 * Why offer it at all, for a login-free app that stores nothing? Because the thing worth
 * keeping is the ROUTE BACK. People deal with a government decision over weeks, on a phone,
 * often without a bookmark habit — and an icon on the home screen is a far better handle
 * than remembering a URL. It is not offered as offline capability, which we do not have.
 *
 * Rules, all enforced here rather than by good intentions:
 *   · never inside a focused tool or on the help page (see pathAllowsInstallCard)
 *   · never before the person has read something — we wait for a real scroll
 *   · one dismissal is permanent; there is deliberately no re-prompt window
 *   · nothing about the person's matter is involved, so nothing sensitive is stored
 */
export function InstallPrompt() {
  const t = useTranslations("install");
  const pathname = usePathname();
  const [mode, setMode] = useState<InstallMode>("none");
  const [engaged, setEngaged] = useState(false);

  const decide = useCallback(() => {
    if (typeof window === "undefined") return;
    const w = window as Window & { __wnInstallPrompt?: unknown };
    setMode(
      installMode({
        hasDeferredPrompt: Boolean(w.__wnInstallPrompt),
        isStandalone:
          window.matchMedia("(display-mode: standalone)").matches ||
          (navigator as Navigator & { standalone?: boolean }).standalone === true,
        isIos: detectIos(navigator.userAgent, navigator.maxTouchPoints, "ontouchstart" in window),
        dismissed: window.localStorage.getItem(INSTALL_DISMISSED_KEY) === "1",
        suppressed: window.localStorage.getItem(INSTALL_OFF_KEY) === "1",
      }),
    );
  }, []);

  useEffect(() => {
    decide();
    // The event may land after mount — layout.tsx stashes it before hydration, but a slow
    // page can still fire it later.
    window.addEventListener("wn:installable", decide);
    window.addEventListener("appinstalled", dismissForever);
    return () => {
      window.removeEventListener("wn:installable", decide);
      window.removeEventListener("appinstalled", dismissForever);
    };
  }, [decide]);

  // Wait until the person has actually engaged with the page. Asking on first paint, before
  // they know whether this is any use to them, is how install prompts earn their reputation.
  useEffect(() => {
    if (engaged) return;
    const onScroll = () => {
      if (window.scrollY > 600) setEngaged(true);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [engaged]);

  function dismissForever() {
    window.localStorage.setItem(INSTALL_DISMISSED_KEY, "1");
    setMode("none");
  }

  async function install() {
    const w = window as Window & {
      __wnInstallPrompt?: { prompt: () => Promise<void>; userChoice: Promise<unknown> };
    };
    const deferred = w.__wnInstallPrompt;
    if (!deferred) return;
    // A deferred prompt is single-use whatever the person chooses.
    w.__wnInstallPrompt = undefined;
    await deferred.prompt();
    await deferred.userChoice;
    dismissForever();
  }

  if (mode === "none" || !engaged || !pathAllowsInstallCard(pathname)) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4">
      <div
        role="dialog"
        aria-label={t("title")}
        className="card sticker flex w-full max-w-[520px] items-start gap-3.5 border-2 border-ink"
        style={{ "--rot": "-0.5deg" } as React.CSSProperties}
      >
        <span className="chip shrink-0" style={{ background: "var(--ink)" }}>
          <Icon.Document className="h-5 w-5 text-cream" strokeWidth={1.9} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[17px] font-black leading-snug text-ink">{t("title")}</p>
          <p className="mt-1 text-[15px] leading-snug text-ink-soft">
            {mode === "ios-instructions" ? t("bodyIos") : t("body")}
          </p>
          <div className="mt-3 flex flex-wrap gap-2.5">
            {mode === "prompt" && (
              <button type="button" onClick={install} className="btn btn-primary">
                {t("action")}
              </button>
            )}
            <button type="button" onClick={dismissForever} className="btn btn-secondary">
              {t("dismiss")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
