"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ToolTopBar } from "@/components/site/ToolTopBar";
import { PrivacyNote } from "@/components/ui/PrivacyNote";
import { useChat } from "@/components/feature/chat/useChat";

/**
 * Full-page /chat — the deep-linkable, full-screen version of the side chat. Shares the
 * same engine (useChat → /api/chat) as the persistent panel, so they behave identically.
 * Sticker album: the conversation sits on the paper, the composer is a white strip under
 * a 2px ink rule, and the "thinking" indicator is three calm tan dots.
 */
export function ChatClient() {
  const { messages, input, setInput, busy, unavailable, handoff, guideHref, send } = useChat();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  return (
    <div className="flex min-h-screen flex-col">
      <ToolTopBar />
      <div className="flex flex-1 flex-col">
        <div className="container-prose flex flex-1 flex-col py-6">
          <h1 className="sr-only">Chat about your decision</h1>

          <div className="flex-1 space-y-3" aria-live="polite" aria-atomic="false">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[86%] rounded-card rounded-br-sm bg-ink px-4 py-2.5 text-[16px] leading-relaxed text-cream shadow-chip"
                      : "max-w-[86%] rounded-card rounded-bl-sm border border-line bg-paper px-4 py-2.5 text-[16px] leading-relaxed text-ink shadow-chip"
                  }
                >
                  {m.content}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="rounded-card rounded-bl-sm border border-line bg-paper px-4 py-3 shadow-chip">
                  <span className="inline-flex gap-1.5" aria-label="Thinking">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-ink-tan [animation-delay:-0.2s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-ink-tan [animation-delay:-0.1s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-ink-tan" />
                  </span>
                </div>
              </div>
            )}
            {unavailable && (
              <div className="rounded-card border-2 border-help bg-help-soft px-4 py-3 text-[15px] leading-relaxed text-help-ink">
                The chat isn’t available right now.{" "}
                <Link href="/start" className="font-semibold underline underline-offset-2">Use the step-by-step guide</Link>{" "}
                or <Link href="/help" className="font-semibold underline underline-offset-2">see free help</Link>.
              </div>
            )}
            <div ref={endRef} />
          </div>

          {handoff && (
            <div className="sticky bottom-[88px] mt-3">
              <Link href={guideHref} className="btn btn-primary btn-lg w-full">
                See your guide →
              </Link>
            </div>
          )}

          <form onSubmit={send} className="sticky bottom-0 -mx-6 mt-3 border-t-2 border-ink bg-paper px-6 pb-4 pt-3">
            <div className="flex items-end gap-2">
              <label htmlFor="chat-input" className="sr-only">Your message</label>
              <textarea
                id="chat-input"
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
              <button type="submit" className="btn btn-primary shrink-0 px-5 text-[15px]" disabled={busy || !input.trim()}>
                Send
              </button>
            </div>
            <PrivacyNote className="mt-2.5" center>
              This conversation isn&rsquo;t stored. Close the tab and it&rsquo;s gone.
            </PrivacyNote>
          </form>
        </div>
      </div>
    </div>
  );
}
