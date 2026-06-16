"use client";

import Script from "next/script";
import { useConsent } from "@/components/analytics/consent";

/**
 * GA4 loader (harness §8.2). No-ops when NEXT_PUBLIC_GA_ID is unset, and only loads
 * after the user grants consent. Never send PII to GA (no names, no letter content,
 * no PII in URLs) — we only measure anonymous page traffic.
 */
export function GoogleAnalytics() {
  const consent = useConsent();
  const id = process.env.NEXT_PUBLIC_GA_ID;
  if (!id || consent !== "granted") return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${id}', { anonymize_ip: true });`}
      </Script>
    </>
  );
}
