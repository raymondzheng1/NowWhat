"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icons";

export function ContactForm() {
  const t = useTranslations("contact");
  const te = useTranslations("errors");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const msg = (m: string) => (m.startsWith("errors.") ? te(m.slice(7)) : m);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 1 || !email.includes("@") || message.trim().length < 10) return;
    setStatus("sending");
    setError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message, company }),
        cache: "no-store",
      });
      const data = await res.json();
      if (data.ok) setStatus("sent");
      else {
        setStatus("error");
        setError(msg(data.message ?? "errors.generic"));
      }
    } catch {
      setStatus("error");
      setError(te("generic"));
    }
  }

  if (status === "sent") {
    return (
      <div className="card border-l-[3px] border-help bg-help-soft">
        <div className="flex items-center gap-2 text-[11.5px] font-bold uppercase tracking-[0.12em] text-help">
          <Icon.CheckSquare className="h-[17px] w-[17px]" strokeWidth={2} /> {t("sentEyebrow")}
        </div>
        <h2 className="mt-2 font-serif text-[22px] font-bold text-help-ink">{t("sentTitle")}</h2>
        <p className="mt-2 text-ink-soft">{t("sentBody")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card">
      <label htmlFor="c-name" className="mb-1.5 block font-semibold text-ink">{t("name")}</label>
      <input id="c-name" value={name} onChange={(e) => setName(e.target.value)} className="input" autoComplete="name" />

      <label htmlFor="c-email" className="mb-1.5 mt-4 block font-semibold text-ink">{t("email")}</label>
      <input id="c-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" autoComplete="email" />

      <label htmlFor="c-message" className="mb-1.5 mt-4 block font-semibold text-ink">{t("message")}</label>
      <textarea id="c-message" rows={6} value={message} onChange={(e) => setMessage(e.target.value)} className="input leading-relaxed" />

      {/* Honeypot — visually hidden, off-screen; real users never fill it. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="c-company">Company</label>
        <input id="c-company" tabIndex={-1} autoComplete="off" value={company} onChange={(e) => setCompany(e.target.value)} />
      </div>

      <button type="submit" className="btn-primary btn-lg mt-5 w-full sm:w-auto" disabled={status === "sending"}>
        {status === "sending" ? t("sending") : t("submit")}
      </button>

      {error && (
        <p role="alert" className="mt-3 rounded-input border-l-[3px] border-gold bg-gold-soft px-3.5 py-3 text-sm text-gold-strong">
          {error}
        </p>
      )}
      <p className="mt-4 text-meta text-ink-faint">{t("privacyNote")}</p>
    </form>
  );
}
