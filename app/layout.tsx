import type { Metadata, Viewport } from "next";
import { Archivo, Caveat, Spline_Sans_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

// Sticker-album theme (design20260816). Self-hosted at build by next/font — no runtime
// Google request, so the CSP needs no font-origin allowance. All three faces are OFL.
//
// --font-display: Archivo — H1, card titles, buttons, section labels. A grotesque with a
// real 900 that holds up at 88px and stays legible at 12.5px uppercase.
const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-display",
  display: "swap",
});
// --font-note: Caveat — the handwritten margin notes (600, tan, small rotations).
const caveat = Caveat({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-note",
  display: "swap",
});
// --font-mono: Spline Sans Mono — receipt/meta lines (sources, the lock line).
const splineMono = Spline_Sans_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});
import { SiteShell } from "@/components/site/SiteShell";
import { JsonLd } from "@/components/site/JsonLd";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { ConsentBanner } from "@/components/analytics/ConsentBanner";
import { siteUrl, PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/config";

const description =
  "Free, plain-English help to challenge an Australian Government (Commonwealth) or Victorian government decision: merits review, judicial review, the grounds of judicial review, time limits, a draft letter you can send, and free legal help. We never keep your letter.";

/**
 * Search terms this service should be findable on. Kept honest — every one of these is a
 * topic the site actually covers in depth, in plain English, with sources.
 */
const KEYWORDS = [
  "merits review",
  "judicial review",
  "grounds of judicial review",
  "public law",
  "administrative law",
  "appeal a government decision",
  "review a government decision",
  "Administrative Review Tribunal",
  "ART appeal",
  "VCAT review",
  "Commonwealth government decision",
  "Victorian government decision",
  "Centrelink decision review",
  "statement of reasons",
  "free legal help Victoria",
];

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${PRODUCT_NAME} — ${PRODUCT_TAGLINE}`,
    template: `%s · ${PRODUCT_NAME}`,
  },
  description,
  applicationName: PRODUCT_NAME,
  keywords: KEYWORDS,
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
  themeColor: "#F6EDD9",
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
    <html lang={locale} className={`${archivo.variable} ${caveat.variable} ${splineMono.variable}`}>
      <head>
        {/*
          Chromium fires `beforeinstallprompt` early — often before React has hydrated — and
          the event is useless once it has been allowed to proceed. Stash it here, then tell
          the app. Inline because a deferred module would miss it.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__wnInstallPrompt=e;window.dispatchEvent(new Event('wn:installable'));});",
          }}
        />
      </head>
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
