"use client";

import { useState } from "react";

/**
 * Shared chat state + send logic for BOTH the persistent side panel and the full-page
 * /chat experience (one engine, two surfaces). Stateless on the server — the client holds
 * the transcript; nothing is stored. Talks to /api/chat (cost-guarded, grounded, no-advice
 * gated server-side) and degrades calmly when no model is configured.
 */
export type ChatMsg = { role: "user" | "assistant"; content: string };

export const CHAT_GREETING =
  "Hi. Tell me about the decision or letter you got — in your own words. I'll work out your options and point you to the right guide and free help.";

export function useChat() {
  const [messages, setMessages] = useState<ChatMsg[]>([{ role: "assistant", content: CHAT_GREETING }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [handoff, setHandoff] = useState<{ area: string; date: string | null } | null>(null);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const next: ChatMsg[] = [...messages, { role: "user", content: text }];
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
      if (data.status === "unavailable") setUnavailable(true);
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

  return { messages, input, setInput, busy, unavailable, handoff, guideHref, send };
}
