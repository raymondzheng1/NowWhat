"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useTranslations } from "next-intl";

/**
 * The "working on it" overlay.
 *
 * Reading a letter or answering a question takes several seconds on the server, and with
 * no visible response people assume the button did not register — so they press it again,
 * or navigate away mid-request. This covers the screen while we wait: it blocks pointer
 * input, holds keyboard focus so Tab cannot reach the form underneath, and says plainly
 * what is happening and roughly how long it takes.
 *
 * Not dismissible while the request looks healthy: the call is in flight, and a person who
 * closed the overlay would be interacting with a form about to be replaced. But a phone on
 * a weak signal can stall, and trapping someone behind an opaque panel with no way out is
 * the worst thing this product could do — so after SLOW_AFTER_MS we admit it is slow and
 * offer two ways out: give up on the request, or go straight to a free service.
 *
 * Leaving is guarded too, not only clicking (the owner's ask, 2026-11-01): closing or
 * reloading the tab asks first, and Back lands on a copy of this page instead of walking
 * away from it. A request abandoned mid-way is still paid for, and the person loses the
 * work they were waiting for.
 *
 * Accessibility: role="dialog" + aria-modal so assistive tech treats the page beneath as
 * inert, aria-busy + a polite live region so a screen reader announces the wait once, and
 * the dots animation is CSS-only (globals disables it under prefers-reduced-motion).
 */
const SLOW_AFTER_MS = 20_000;
/** Marks the history entry Back lands on while we wait, so it is removed only if still ours. */
const GUARD = "wnBusyGuard";

export type BusyStep = { label: string; state: "done" | "active" | "waiting" };

export function Busy({
  show,
  title,
  detail,
  steps,
  slowAfterMs = SLOW_AFTER_MS,
  onCancel,
  cancelLabel,
}: {
  show: boolean;
  /** Short line: what is happening. Defaults to the shared "Working on it…". */
  title?: string;
  /** Optional second line: what to expect. */
  detail?: string;
  /** The parts of a longer wait, each ticked off as it finishes. */
  steps?: BusyStep[];
  /** How long before we admit it is slow and offer a way out. */
  slowAfterMs?: number;
  /** Called if the person gives up on a stalled request; enables the Cancel button. */
  onCancel?: () => void;
  /** The Cancel button's words, where "Stop waiting" is not what it does. */
  cancelLabel?: string;
}) {
  const t = useTranslations("common");
  const panelRef = useRef<HTMLDivElement>(null);
  const [slow, setSlow] = useState(false);
  /** What Escape does: the cancel action, once the slow notice offers it. */
  const cancelRef = useRef<(() => void) | null>(null);
  cancelRef.current = slow && onCancel ? onCancel : null;

  // Own up to a slow request rather than leaving the person staring at three dots.
  useEffect(() => {
    if (!show) {
      setSlow(false);
      return;
    }
    const id = window.setTimeout(() => setSlow(true), slowAfterMs);
    return () => window.clearTimeout(id);
  }, [show, slowAfterMs]);

  // Don't let them leave by accident while we wait.
  useEffect(() => {
    if (!show) return;
    const beforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);

    // Back: a copy of this entry sits on top, so Back lands here (same address, so the
    // page's own history handlers change nothing) and the copy is put back.
    //
    // Only over an entry the router made (`__NA`). Next reloads the page when Back lands on
    // one it did not — e.g. a step pushed before it had hydrated — and a reload mid-wait is
    // the very thing this guards against. There, the overlay and the unload prompt still hold.
    const pushGuard = () => {
      const state = (window.history.state ?? {}) as Record<string, unknown>;
      // Never two copies (a re-run before the last one's Back has landed).
      if (state[GUARD] || !state.__NA) return;
      try {
        window.history.pushState({ ...(window.history.state ?? {}), [GUARD]: true }, "", window.location.href);
      } catch {
        /* history unavailable — the overlay still blocks the page */
      }
    };
    pushGuard();
    // The router stamps an entry just after it is pushed, so try again until it can go on.
    const retry = window.setInterval(pushGuard, 400);
    const onPop = () => pushGuard();
    window.addEventListener("popstate", onPop);

    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("popstate", onPop);
      window.clearInterval(retry);
      // Take the copy away again, but only if it is still on top: if the page moved on
      // meanwhile, going back would undo that.
      if ((window.history.state ?? {})[GUARD]) window.history.back();
    };
  }, [show]);

  // Hold focus inside the overlay, and stop the page behind it from scrolling.
  useEffect(() => {
    if (!show) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus({ preventScroll: true });

    // Tab moves through the panel's own controls and stays inside it. It used to send focus back
    // to the panel every time, so "Stop waiting" and "Get free help" could never be reached from
    // a keyboard (the QA review, 2026-11-02). Escape is the way out once one is offered.
    const keepFocus = (e: KeyboardEvent) => {
      const panel = panelRef.current;
      if (!panel) return;
      if (e.key === "Escape" && cancelRef.current) {
        e.preventDefault();
        cancelRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const stops = [panel, ...panel.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")];
      const at = stops.indexOf(document.activeElement as HTMLElement);
      const next = stops[(at + (e.shiftKey ? stops.length - 1 : 1) + stops.length) % stops.length] ?? panel;
      e.preventDefault();
      next.focus({ preventScroll: true });
    };
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", keepFocus, true);

    return () => {
      document.removeEventListener("keydown", keepFocus, true);
      document.body.style.overflow = overflow;
      // Without scrolling to it. The button pressed is usually the step's "Next" at the foot of
      // the page, and the step that replaced it starts at the top: focusing it the plain way
      // dragged every new step down to its last line (reported 2026-11-01).
      if (previouslyFocused?.isConnected) previouslyFocused.focus({ preventScroll: true });
    };
  }, [show]);

  if (!show) return null;

  // Into <body>, not where it is used: inside a step that draws itself with a transform, a
  // "fixed" layer is fixed to that step, not the screen, and its panel can sit off-screen.
  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-6"
      style={{ background: "rgba(43,36,23,0.55)" }}
      role="dialog"
      aria-modal="true"
      aria-busy="true"
      aria-labelledby="busy-title"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="card sticker max-w-[420px] text-center outline-none"
        style={{ "--rot": "-0.9deg" } as React.CSSProperties}
      >
        <span className="wn-dots mx-auto mb-4 flex justify-center gap-2" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <h2 id="busy-title" className="font-display text-[21px] font-black text-ink">
          {title ?? t("loading")}
        </h2>
        <p className="mt-2 text-[15.5px] leading-relaxed text-ink-soft" aria-live="polite">
          {detail ?? t("busyDetail")}
        </p>

        {steps && steps.length > 0 && (
          <ol className="mx-auto mt-4 max-w-[320px] space-y-2 text-left" aria-live="polite" data-testid="busy-steps">
            {steps.map((s) => (
              <li key={s.label} className="flex items-center gap-3 text-[15px] leading-snug" data-state={s.state}>
                <span className={`wn-step-mark wn-step-${s.state}`} aria-hidden="true">
                  {s.state === "done" ? "✓" : ""}
                </span>
                <span className={s.state === "waiting" ? "text-ink-faint" : "font-semibold text-ink"}>
                  {s.label}
                  <span className="sr-only">
                    {" — "}
                    {t(s.state === "done" ? "busyStepDone" : s.state === "active" ? "busyStepActive" : "busyStepWaiting")}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        )}

        {slow && (
          <div className="mt-5 border-t-2 border-line pt-4" aria-live="polite">
            <p className="text-[15px] leading-relaxed text-ink-soft">{t("busySlow")}</p>
            <div className="mt-3.5 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
              {onCancel && (
                <button type="button" onClick={onCancel} className="btn btn-secondary">
                  {cancelLabel ?? t("busyCancel")}
                </button>
              )}
              <Link href="/help" className="btn btn-help">
                {t("busyGetHelp")}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
