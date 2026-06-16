"use client";

import { useEffect, useState } from "react";
import { loadSession, saveSession } from "@/lib/storage/local";

/**
 * Analytics consent (harness §8.2). Default declines analytics until the user opts in
 * (AU Privacy Act / GDPR posture). Stored on-device only.
 */
const EVENT = "whatnow:consent";

export type Consent = "granted" | "denied" | "unset";

export function getConsent(): Consent {
  const c = loadSession().analyticsConsent;
  return c === true ? "granted" : c === false ? "denied" : "unset";
}

export function setConsent(granted: boolean): void {
  saveSession({ analyticsConsent: granted });
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
}

export function useConsent(): Consent {
  const [consent, setState] = useState<Consent>("unset");
  useEffect(() => {
    const sync = () => setState(getConsent());
    sync();
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);
  return consent;
}
