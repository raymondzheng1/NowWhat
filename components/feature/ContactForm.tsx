"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icons";

type FieldErrors = { name?: string; email?: string; message?: string };

export function ContactForm() {
  const t = useTranslations("contact");
  const te = useTranslations("errors");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});

  const msg = (m: string) => (m.startsWith("errors.") ? te(m.slice(7)) : m);

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (name.trim().length < 1) next.name = t("errName");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) next.email = t("errEmail");
    if (message.trim().length < 10) next.message = t("errMessage");
    return next;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    // Validate first — always give the user a reaction (was a silent no-op before).
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length > 0) {
      setStatus("error");
      setError(t("fixErrors"));
      return;
    }
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

  const errId = (f: keyof FieldErrors) => (errors[f] ? `c-${f}-err` : undefined);

  return (
    <form onSubmit={submit} noValidate className="card">
      <label htmlFor="c-name" className="mb-1.5 block font-semibold text-ink">{t("name")}</label>
      <input
        id="c-name"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          if (errors.name) setErrors((x) => ({ ...x, name: undefined }));
        }}
        className="input"
        autoComplete="name"
        aria-invalid={!!errors.name}
        aria-describedby={errId("name")}
      />
      {errors.name && <p id="c-name-err" className="mt-1.5 text-sm text-danger">{errors.name}</p>}

      <label htmlFor="c-email" className="mb-1.5 mt-4 block font-semibold text-ink">{t("email")}</label>
      <input
        id="c-email"
        type="email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (errors.email) setErrors((x) => ({ ...x, email: undefined }));
        }}
        className="input"
        autoComplete="email"
        aria-invalid={!!errors.email}
        aria-describedby={errId("email")}
      />
      {errors.email && <p id="c-email-err" className="mt-1.5 text-sm text-danger">{errors.email}</p>}

      <label htmlFor="c-message" className="mb-1.5 mt-4 block font-semibold text-ink">{t("message")}</label>
      <textarea
        id="c-message"
        rows={6}
        value={message}
        onChange={(e) => {
          setMessage(e.target.value);
          if (errors.message) setErrors((x) => ({ ...x, message: undefined }));
        }}
        className="input leading-relaxed"
        aria-invalid={!!errors.message}
        aria-describedby={errId("message")}
      />
      {errors.message && <p id="c-message-err" className="mt-1.5 text-sm text-danger">{errors.message}</p>}

      {/* Honeypot — visually hidden, off-screen; real users never fill it. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="c-company">Company</label>
        <input id="c-company" tabIndex={-1} autoComplete="off" value={company} onChange={(e) => setCompany(e.target.value)} />
      </div>

      <button type="submit" className="btn-primary btn-lg mt-5 w-full sm:w-auto" disabled={status === "sending"}>
        {status === "sending" ? t("sending") : t("submit")}
      </button>

      {error && (
        <div role="alert" className="mt-3 rounded-input border-l-[3px] border-gold bg-gold-soft px-3.5 py-3 text-sm text-gold-strong">
          <p>{error}</p>
          <Link href="/help" className="mt-1.5 inline-block font-semibold underline underline-offset-2">
            {t("seeHelp")} →
          </Link>
        </div>
      )}
      <p className="mt-4 text-meta text-ink-faint">{t("privacyNote")}</p>
    </form>
  );
}
