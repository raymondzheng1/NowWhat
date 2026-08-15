"use client";

import { useEffect, useRef, useState } from "react";
import { ChatPanel } from "@/components/feature/chat/ChatPanel";

const DISMISS_KEY = "wn-chat-dismissed";

/**
 * Persistent chat launcher (sticker album) — a red pill sticker fixed bottom-right on
 * content/marketing pages, tilted -1.2deg with a hard offset shadow; it straightens and
 * lifts on hover, sticks down on press. Clicking it opens the side chat PANEL in place (a
 * focus-trapped dialog), not a new page. Speech-bubble glyph only — no robot, no sparkle,
 * no AI framing. Dismissible — the dismissal is remembered for THE SESSION ONLY
 * (sessionStorage; never persisted, never stores anything the user types).
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
        <div className="fixed bottom-4 right-4 z-30 flex items-center gap-2 sm:bottom-6 sm:right-6">
          <button
            ref={launcherRef}
            type="button"
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={open}
            className="sticker inline-flex min-h-[48px] items-center gap-2.5 rounded-pill px-5 py-3 font-display text-[14.5px] font-extrabold text-cream-onRed"
            style={{ "--rot": "-1.2deg", background: "var(--red-cta)" } as React.CSSProperties}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 5h16v11H9l-4 4z" />
            </svg>
            <span>Work it out with us</span>
          </button>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Hide chat for now"
            className="flex h-11 w-11 items-center justify-center rounded-pill border-2 border-ink bg-paper text-ink hover:bg-cream"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      )}

      {open && <ChatPanel onClose={close} />}
    </>
  );
}
