import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
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
  themeColor: "#1f6f78",
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
    <html lang={locale}>
      <body className="flex min-h-screen flex-col">
        <JsonLd data={websiteLd} />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <a href="#main" className="skip-link">Skip to content</a>
          <Header />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer />
          <ConsentBanner />
        </NextIntlClientProvider>
        <Analytics />
        <GoogleAnalytics />
      </body>
    </html>
  );
}
