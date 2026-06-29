"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useChat } from "@/components/feature/chat/useChat";
import { Icon } from "@/components/ui/icons";

/**
 * The open side-chat panel (Direction K2). Docked right on desktop (~400px), full-screen
 * sheet on mobile; sticky teal header with a visible ×, scrollable message list (aria-live),
 * a calm "thinking" indicator (copper dots — never "AI is typing"), a handoff CTA, and a
 * sticky composer. Focus-trapped role="dialog"; Esc closes; focus returns to the launcher.
 * Ephemeral — the conversation is never stored.
 */
export function ChatPanel({ onClose }: { onClose: () => void }) {
  const { messages, input, setInput, busy, unavailable, handoff, guideHref, send } = useChat();
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  // Esc closes; Tab is trapped within the dialog.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Tab" && panelRef.current) {
        const f = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),textarea,input,[tabindex]:not([tabindex="-1"])',
        );
        if (f.length === 0) return;
        const first = f[0]!;
        const last = f[f.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-rail/30" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-panel-title"
        className="wn-slide-in absolute inset-0 flex flex-col bg-sand sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[400px] sm:shadow-cta"
      >
        {/* Header */}
        <header className="flex items-center justify-between gap-3 bg-rail px-4 py-3 text-rail-fg">
          <div>
            <p id="chat-panel-title" className="font-display text-[18px] font-semibold">Work it out with us</p>
            <p className="text-[11px] tracking-[0.02em] text-rail-fg/70">Calm help · not stored</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close chat"
            className="flex h-9 w-9 items-center justify-center rounded-button border border-rail-accent/50 text-rail-fg hover:bg-rail-dark"
          >
            <Icon.Close className="h-4 w-4" strokeWidth={2} />
          </button>
        </header>

        {/* Messages */}
        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite" aria-atomic="false">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={
                  m.role === "user"
                    ? "max-w-[88%] rounded-card rounded-br-sm bg-rail px-3.5 py-2.5 text-[14.5px] leading-relaxed text-rail-fg"
                    : "max-w-[88%] rounded-card rounded-bl-sm border border-line bg-paper px-3.5 py-2.5 text-[14.5px] leading-relaxed text-ink"
                }
              >
                {m.content}
              </div>
            </div>
          ))}

          {busy && (
            <div className="flex justify-start">
              <div className="rounded-card rounded-bl-sm border border-line bg-paper px-4 py-3">
                <span className="inline-flex gap-1" aria-label="Thinking">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-rail-accent [animation-delay:-0.2s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-rail-accent [animation-delay:-0.1s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-rail-accent" />
                </span>
              </div>
            </div>
          )}

          {unavailable && (
            <div className="rounded-card border-l-[3px] border-help bg-help-soft px-3.5 py-3 text-[13.5px] text-help-ink">
              The chat isn’t available right now.{" "}
              <Link href="/start" className="font-semibold underline">use the step-by-step guide</Link>{" "}
              or{" "}
              <Link href="/help" className="font-semibold underline">see free help</Link>.
            </div>
          )}

          <div ref={endRef} />
        </div>

        {/* Handoff — the goal */}
        {handoff && (
          <div className="px-4 pb-2">
            <Link href={guideHref} className="btn-help w-full" onClick={onClose}>
              See your guide →
            </Link>
          </div>
        )}

        {/* Composer */}
        <form onSubmit={send} className="border-t border-line bg-sand-surface px-4 py-3">
          <div className="flex items-end gap-2">
            <label htmlFor="chat-panel-input" className="sr-only">Your message</label>
            <textarea
              id="chat-panel-input"
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={2}
              placeholder="Type your message…"
              className="input flex-1 leading-relaxed"
            />
            <button type="submit" className="btn-primary" disabled={busy || !input.trim()}>
              Send
            </button>
          </div>
          <p className="mt-2 text-[11px] text-ink-faint">This conversation isn’t stored. Close it and it’s gone.</p>
        </form>
      </div>
    </div>
  );
}
