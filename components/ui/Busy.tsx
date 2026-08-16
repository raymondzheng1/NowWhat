"use client";

import { useEffect, useRef, useState } from "react";
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
 * Accessibility: role="dialog" + aria-modal so assistive tech treats the page beneath as
 * inert, aria-busy + a polite live region so a screen reader announces the wait once, and
 * the dots animation is CSS-only (globals disables it under prefers-reduced-motion).
 */
const SLOW_AFTER_MS = 20_000;

export function Busy({
  show,
  title,
  detail,
  onCancel,
}: {
  show: boolean;
  /** Short line: what is happening. Defaults to the shared "Working on it…". */
  title?: string;
  /** Optional second line: what to expect. */
  detail?: string;
  /** Called if the person gives up on a stalled request; enables the Cancel button. */
  onCancel?: () => void;
}) {
  const t = useTranslations("common");
  const panelRef = useRef<HTMLDivElement>(null);
  const [slow, setSlow] = useState(false);

  // Own up to a slow request rather than leaving the person staring at three dots.
  useEffect(() => {
    if (!show) {
      setSlow(false);
      return;
    }
    const id = window.setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => window.clearTimeout(id);
  }, [show]);

  // Hold focus inside the overlay, and stop the page behind it from scrolling.
  useEffect(() => {
    if (!show) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    const keepFocus = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        e.preventDefault();
        panelRef.current?.focus();
      }
    };
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", keepFocus, true);

    return () => {
      document.removeEventListener("keydown", keepFocus, true);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [show]);

  if (!show) return null;

  return (
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

        {slow && (
          <div className="mt-5 border-t-2 border-line pt-4" aria-live="polite">
            <p className="text-[15px] leading-relaxed text-ink-soft">{t("busySlow")}</p>
            <div className="mt-3.5 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
              {onCancel && (
                <button type="button" onClick={onCancel} className="btn btn-secondary">
                  {t("busyCancel")}
                </button>
              )}
              <Link href="/help" className="btn btn-help">
                {t("busyGetHelp")}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
