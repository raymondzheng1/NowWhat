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
    <html lang={locale} className={`${archivo.variable} ${caveat.variable} ${splineMono.variable}`}>
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
