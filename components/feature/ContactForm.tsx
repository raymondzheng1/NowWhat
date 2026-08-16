"use client";

import { useState } from "react";
import { Busy } from "@/components/ui/Busy";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icons";

type FieldErrors = { name?: string; email?: string; message?: string };

/**
 * Contact form (sticker album) — one white sticker card with a gentle tilt, Archivo
 * field labels, .input controls and the red primary submit. Validation, the honeypot
 * and every handler are unchanged; this is a skin only.
 *
 * The error alert is RED, never amber: amber is reserved for time limits.
 */
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

  const labelClass = "mb-2 block font-display text-[15px] font-extrabold text-ink";

  if (status === "sent") {
    return (
      <div
        className="card sticker border-2 border-help bg-help-soft"
        style={{ "--rot": "0.9deg" } as React.CSSProperties}
      >
        <div className="flex items-center gap-2 font-display text-label font-black uppercase text-help-ink">
          <Icon.CheckSquare className="h-[17px] w-[17px]" strokeWidth={2} /> {t("sentEyebrow")}
        </div>
        <h2 className="mt-2.5 text-h2 text-help-ink">{t("sentTitle")}</h2>
        <p className="mt-2 text-ink-soft">{t("sentBody")}</p>
      </div>
    );
  }

  const errId = (f: keyof FieldErrors) => (errors[f] ? `c-${f}-err` : undefined);

  return (
    <>
      <Busy show={status === "sending"} title="Sending your message" />
      <form
      onSubmit={submit}
      noValidate
      className="card sticker"
      style={{ "--rot": "-0.6deg" } as React.CSSProperties}
    >
      <label htmlFor="c-name" className={labelClass}>{t("name")}</label>
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
      {errors.name && <p id="c-name-err" className="mt-2 text-sm font-semibold text-danger">{errors.name}</p>}

      <label htmlFor="c-email" className={`mt-5 ${labelClass}`}>{t("email")}</label>
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
      {errors.email && <p id="c-email-err" className="mt-2 text-sm font-semibold text-danger">{errors.email}</p>}

      <label htmlFor="c-message" className={`mt-5 ${labelClass}`}>{t("message")}</label>
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
      {errors.message && <p id="c-message-err" className="mt-2 text-sm font-semibold text-danger">{errors.message}</p>}

      {/* Honeypot. The id and label used to say "company", which is precisely what Chrome's
          autofill matches on — so it filled the field for real people and their message was
          rejected. Neutral naming, plus the opt-out attributes the major password managers
          honour. A filled value is now flagged rather than fatal (see the route). */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="c-ref-2">Reference</label>
        <input
          id="c-ref-2"
          name="c-ref-2"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          data-lpignore="true"
          data-1p-ignore="true"
          data-form-type="other"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
      </div>

      <button type="submit" className="btn btn-primary btn-lg mt-6 w-full sm:w-auto" disabled={status === "sending"}>
        {status === "sending" ? t("sending") : t("submit")}
      </button>

      {error && (
        <div role="alert" className="mt-4 rounded-input border-2 border-red bg-cream px-4 py-3 text-sm text-ink">
          <p>{error}</p>
          <Link href="/help" className="link mt-1.5 inline-block font-semibold">
            {t("seeHelp")} →
          </Link>
        </div>
      )}
      <p className="mt-5 text-sm text-ink-faint">{t("privacyNote")}</p>
      </form>
    </>
  );
}
