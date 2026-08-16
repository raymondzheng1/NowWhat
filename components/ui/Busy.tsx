"use client";

import { useEffect, useRef } from "react";
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
 * Deliberately NOT dismissible: the request is already in flight, and a person who closes
 * the overlay would be interacting with a form that is about to be replaced. Esc does
 * nothing here for the same reason.
 *
 * Accessibility: role="dialog" + aria-modal so assistive tech treats the page beneath as
 * inert, aria-busy + a polite live region so a screen reader announces the wait once, and
 * the dots animation is CSS-only (globals disables it under prefers-reduced-motion).
 */
export function Busy({
  show,
  title,
  detail,
}: {
  show: boolean;
  /** Short line: what is happening. Defaults to the shared "Working on it…". */
  title?: string;
  /** Optional second line: what to expect. */
  detail?: string;
}) {
  const t = useTranslations("common");
  const panelRef = useRef<HTMLDivElement>(null);

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
      </div>
    </div>
  );
}
