"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ToolTopBar } from "@/components/site/ToolTopBar";
import { PrivacyNote } from "@/components/ui/PrivacyNote";

type Msg = { role: "user" | "assistant"; content: string };

const GREETING =
  "Hi. Tell me about the decision or letter you got — in your own words. I'll work out your options and point you to the right guide and free help.";

export function ChatClient() {
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: GREETING }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [handoff, setHandoff] = useState<{ area: string; date: string | null } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-40) }),
        cache: "no-store",
      });
      const data = await res.json();
      const reply: string =
        data.reply ?? "Something went wrong. You can use the step-by-step guide, or see free help.";
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
      if (data.area) setHandoff({ area: data.area, date: data.decisionDate ?? null });
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Something went wrong on my end. Please try the step-by-step guide." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  const guideHref = handoff
    ? `/start?area=${handoff.area}${handoff.date ? `&date=${handoff.date}` : ""}`
    : "/start";

  return (
    <div className="flex min-h-screen flex-col">
      <ToolTopBar />
      <div className="flex flex-1 flex-col bg-paper-warm">
        <div className="container-prose flex flex-1 flex-col py-6">
          <h1 className="sr-only">Chat about your decision</h1>

          <div className="flex-1 space-y-3" aria-live="polite" aria-atomic="false">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[86%] rounded-card rounded-br-sm bg-navy px-4 py-2.5 text-[15px] leading-relaxed text-white"
                      : "max-w-[86%] rounded-card rounded-bl-sm border border-line-card bg-paper px-4 py-2.5 text-[15px] leading-relaxed text-ink-soft shadow-card"
                  }
                >
                  {m.content}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="rounded-card rounded-bl-sm border border-line-card bg-paper px-4 py-3 text-ink-faint shadow-card">
                  <span className="inline-flex gap-1" aria-label="Thinking">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-ink-faint [animation-delay:-0.2s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-ink-faint [animation-delay:-0.1s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-ink-faint" />
                  </span>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {handoff && (
            <div className="sticky bottom-[88px] mt-3">
              <Link href={guideHref} className="btn-primary btn-lg w-full">
                See your guide →
              </Link>
            </div>
          )}

          <form onSubmit={send} className="sticky bottom-0 mt-3 bg-paper-warm pb-4 pt-2">
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
              <button type="submit" className="btn-primary" disabled={busy || !input.trim()}>
                Send
              </button>
            </div>
            <PrivacyNote className="mt-2" center>
              This conversation isn&rsquo;t stored. Close the tab and it&rsquo;s gone.
            </PrivacyNote>
          </form>
        </div>
      </div>
    </div>
  );
}
