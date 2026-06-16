import createNextIntlPlugin from "next-intl/plugin";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");
const projectRoot = dirname(fileURLToPath(import.meta.url));

const isDev = process.env.NODE_ENV !== "production";

/**
 * Content-Security-Policy (harness §6.6, §8.2).
 * - GA origins are allow-listed (googletagmanager / google-analytics) — GA is silently
 *   blocked otherwise (validated gotcha, harness §8.2).
 * - Vercel Analytics is first-party in prod (/_vercel/insights, same-origin) — only the
 *   DEV debug script loads from va.vercel-scripts.com, so we allow it for dev ONLY.
 */
function contentSecurityPolicy() {
  const ga = "https://www.googletagmanager.com https://www.google-analytics.com";
  const gaConnect =
    "https://www.google-analytics.com https://region1.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com";
  // Dev only: Next's React Refresh / HMR uses eval, so dev needs 'unsafe-eval' or the
  // client bundle is CSP-blocked and the app never hydrates. Production never uses eval.
  const devScript = isDev ? " 'unsafe-eval' https://va.vercel-scripts.com" : "";
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' ${ga}${devScript}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${ga}`,
    "font-src 'self' data:",
    `connect-src 'self' ${gaConnect}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy() },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pin the tracing root so a stray lockfile elsewhere on the machine isn't picked up.
  outputFileTracingRoot: projectRoot,
  // The user's letter must never be persisted. We never write uploads to disk;
  // OCR + processing happen in memory inside route handlers (TECHNICAL_SPEC §8).
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
