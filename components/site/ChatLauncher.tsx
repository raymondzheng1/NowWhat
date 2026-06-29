"use client";

import { useEffect, useRef, useState } from "react";
import { ChatPanel } from "@/components/feature/chat/ChatPanel";

const DISMISS_KEY = "wn-chat-dismissed";

/**
 * Persistent chat launcher (Direction K2) — a calm helper fixed bottom-right on
 * content/marketing pages. Clicking it opens the side chat PANEL in place (a focus-trapped
 * dialog), not a new page. No robot/sparkle/AI framing. Dismissible — the dismissal is
 * remembered for THE SESSION ONLY (sessionStorage; never persisted, never stores anything
 * the user types).
 */
export function ChatLauncher() {
  // Start hidden until we've read sessionStorage, so a dismissed launcher never flashes.
  const [shown, setShown] = useState(false);
  const [open, setOpen] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) !== "1") setShown(true);
    } catch {
      setShown(true);
    }
  }, []);

  function dismiss() {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* sessionStorage unavailable — just hide for this view */
    }
    setShown(false);
  }

  function close() {
    setOpen(false);
    // Return focus to the launcher (a11y — focus returns to the trigger).
    requestAnimationFrame(() => launcherRef.current?.focus());
  }

  return (
    <>
      {shown && !open && (
        <div className="fixed bottom-4 right-4 z-30 flex items-center gap-1.5 sm:bottom-6 sm:right-6">
          <button
            ref={launcherRef}
            type="button"
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={open}
            className="inline-flex min-h-[48px] items-center gap-2.5 rounded-pill border border-rail-accent bg-rail px-5 py-3 text-rail-fg shadow-launcher transition-shadow hover:shadow-cta"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#c79a52"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 5h16v11H9l-4 4z" />
            </svg>
            <span className="text-[13px] font-semibold tracking-[0.04em]">Work it out with us</span>
          </button>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Hide chat for now"
            className="flex h-7 w-7 items-center justify-center self-start rounded-pill border border-line bg-sand-surface text-ink-soft hover:text-ink"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      )}

      {open && <ChatPanel onClose={close} />}
    </>
  );
}
