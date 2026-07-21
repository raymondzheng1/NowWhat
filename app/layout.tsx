import type { Metadata, Viewport } from "next";
import { Source_Serif_4, Libre_Baskerville } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

// K2 "Deep teal & sand". Self-hosted at build by next/font — no runtime Google
// request, so the CSP needs no font-origin allowance.
//
// --font-display: Source Serif 4 — H1, section/step titles, wordmark. Replaced Cormorant
// Garamond (2026-07-13): Cormorant is a high-contrast display face whose hairline strokes
// read as thin and are genuinely hard to read at body-adjacent sizes — the wrong trade for
// an audience in distress, on a phone, possibly with low vision. Source Serif 4 keeps the
// editorial voice with far lower stroke contrast and a real weight range.
const displaySerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});
// Libre Baskerville (--font-serif): buttons + wordmark fallback.
const baskerville = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});
import { SiteShell } from "@/components/site/SiteShell";
import { JsonLd } from "@/components/site/JsonLd";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { ConsentBanner } from "@/components/analytics/ConsentBanner";
import { siteUrl, PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/config";

const description =
  "Free, plain-English help to understand a government decision: what it means, the review pathway, the time limit, a draft you can use, and free legal help. We never keep your letter.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${PRODUCT_NAME} — ${PRODUCT_TAGLINE}`,
    template: `%s · ${PRODUCT_NAME}`,
  },
  description,
  applicationName: PRODUCT_NAME,
  alternates: { canonical: "/" },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: { url: "/apple-touch-icon-180.png" },
  },
  openGraph: {
    type: "website",
    siteName: PRODUCT_NAME,
    title: `${PRODUCT_NAME} — ${PRODUCT_TAGLINE}`,
    description,
    url: siteUrl(),
  },
  twitter: { card: "summary_large_image", title: PRODUCT_NAME, description },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#10363d",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  const websiteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: PRODUCT_NAME,
    url: siteUrl(),
    description,
    publisher: {
      "@type": "Organization",
      name: PRODUCT_NAME,
      url: siteUrl(),
    },
  };

  return (
    <html lang={locale} className={`${displaySerif.variable} ${baskerville.variable}`}>
      <body className="flex min-h-screen flex-col">
        <JsonLd data={websiteLd} />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SiteShell>{children}</SiteShell>
          <ConsentBanner />
        </NextIntlClientProvider>
        <Analytics />
        <GoogleAnalytics />
      </body>
    </html>
  );
}
