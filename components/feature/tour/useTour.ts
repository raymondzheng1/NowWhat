"use client";

import { useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { TOUR_IDS, TOUR_OFF_KEY, tourFlagKey, type TourStepDef } from "@/lib/tour/steps";
import "driver.js/dist/driver.css";

/**
 * First-run guided walkthrough (harness §14.11).
 *
 * Fires at the threshold of a substantive screen — never on the landing page — and shows
 * exactly once per screen. The flag is set when the tour STARTS, not when it finishes, so a
 * guide dismissed halfway doesn't ambush the person again on their next visit.
 *
 * driver.js is dynamic-imported here so returning users (flag already set) never download it.
 */
export function useTour(id: string, steps: TourStepDef[], enabled = true) {
  const t = useTranslations("tour");
  // Hold `t` in a ref: next-intl doesn't guarantee a stable identity, and a changing dep
  // would tear down and restart the tour mid-view.
  const tRef = useRef(t);
  tRef.current = t;
  const runRef = useRef<(force: boolean) => void>(() => {});

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let cancelled = false;
    let instance: { destroy?: () => void } | null = null;
    const key = tourFlagKey(id);

    const run = async (force: boolean) => {
      if (localStorage.getItem(TOUR_OFF_KEY)) return;
      if (!force && localStorage.getItem(key)) return;

      // Only spotlight what is actually on screen — a step pointing at a missing element
      // renders an orphaned popover in the corner.
      const present = steps.filter((s) => document.querySelector(`[data-tour="${s.el}"]`));
      if (present.length === 0 || cancelled) return;

      localStorage.setItem(key, "1");
      const { driver } = await import("driver.js");
      if (cancelled) return;

      const tr = tRef.current;
      instance = driver({
        // rAF-driven stage glides stutter on cheap phones and freeze in embedded webviews.
        animate: false,
        allowClose: true,
        overlayOpacity: 0.65,
        stagePadding: 6,
        stageRadius: 4,
        popoverClass: "wn-tour",
        showProgress: present.length > 1,
        nextBtnText: tr("next"),
        prevBtnText: tr("back"),
        doneBtnText: tr("done"),
        steps: present.map((s) => ({
          element: `[data-tour="${s.el}"]`,
          popover: { title: tr(s.titleKey), description: tr(s.textKey) },
        })),
      });
      (instance as { drive: () => void }).drive();
    };

    runRef.current = (force: boolean) => void run(force);
    // Let data and layout settle before spotlighting, or the highlight lands on a stale box.
    const timer = window.setTimeout(() => void run(false), 900);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      instance?.destroy?.();
    };
  }, [id, steps, enabled]);

  /** Replay this screen's guide on demand — also the support answer ("tap Show me how"). */
  return useCallback(() => runRef.current(true), []);
}

/** Clear every tour flag so all guides show again from the start. */
export function replayAllTours() {
  if (typeof window === "undefined") return;
  for (const id of TOUR_IDS) localStorage.removeItem(tourFlagKey(id));
}
