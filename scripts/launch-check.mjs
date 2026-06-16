// launch:check (harness §4.7) — encodes the Tier-B Appendix-A launch deliverables as
// machine-checked markers so an unread section can't cause a silent omission.
// Checks PRESENCE (cheap markers), not behaviour. Wired into `verify`.

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fails = [];
const read = (rel) => (existsSync(resolve(ROOT, rel)) ? readFileSync(resolve(ROOT, rel), "utf8") : "");

function walk(dir, ext) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const n of readdirSync(dir)) {
    const full = resolve(dir, n);
    if (statSync(full).isDirectory()) {
      if (["node_modules", ".next"].includes(n)) continue;
      out.push(...walk(full, ext));
    } else if (n.endsWith(ext)) out.push(full);
  }
  return out;
}
const anyFileMatches = (dir, ext, re) =>
  walk(resolve(ROOT, dir), ext).some((f) => re.test(readFileSync(f, "utf8")));

function need(cond, msg) {
  if (!cond) fails.push(msg);
}

// --- PWA: installable manifest + icons (harness §19, Appendix A) ---
const hasManifest = existsSync(resolve(ROOT, "app/manifest.ts")) || existsSync(resolve(ROOT, "public/manifest.webmanifest"));
need(hasManifest, "no PWA manifest (app/manifest.ts) — installable app required");
need(
  existsSync(resolve(ROOT, "app/icon.svg")) ||
    existsSync(resolve(ROOT, "app/icon.png")) ||
    existsSync(resolve(ROOT, "public/icon-192.png")),
  "no app icon (app/icon.svg or app/icon.png)",
);
// The 1200×630 social share image (handoff asset).
need(existsSync(resolve(ROOT, "app/opengraph-image.tsx")), "no OG share image (app/opengraph-image.tsx)");

// --- Analytics: Vercel <Analytics/> mounted + GA loader present (harness §8.2/§8.5) ---
const layout = read("app/layout.tsx");
need(/@vercel\/analytics/.test(layout) && /<Analytics/.test(layout), "Vercel <Analytics/> not mounted in app/layout.tsx (§8.5)");
need(anyFileMatches("components", ".tsx", /NEXT_PUBLIC_GA_ID|googletagmanager/) || anyFileMatches("app", ".tsx", /NEXT_PUBLIC_GA_ID|googletagmanager/), "GA4 loader not present (§8.2)");

// --- SEO: sitemap/robots/per-route metadata + JSON-LD ---
need(existsSync(resolve(ROOT, "app/sitemap.ts")), "missing app/sitemap.ts");
need(existsSync(resolve(ROOT, "app/robots.ts")), "missing app/robots.ts");
need(/export const metadata|generateMetadata/.test(layout), "root layout has no metadata export");
need(anyFileMatches("app", ".tsx", /application\/ld\+json|WebSite|Organization/), "no JSON-LD structured data anywhere (§8)");

// --- §15 platform gotcha: dual KV env-name read, pinned by its own unit test ---
const kv = read("lib/kv/redis.ts");
need(/KV_REST_API_URL/.test(kv) && /UPSTASH_REDIS_REST_URL/.test(kv), "lib/kv/redis.ts must read BOTH UPSTASH_* and KV_* env names (harness §15)");

// --- Safety invariants must be wired (this product's launch-critical markers) ---
need(existsSync(resolve(ROOT, "lib/verification/verify.ts")), "missing lib/verification/verify.ts (grounded-or-silent gate)");
need(existsSync(resolve(ROOT, "lib/cost/guard.ts")), "missing lib/cost/guard.ts (cost guard, fail-closed)");
need(/DISCLAIMER/.test(read("lib/config.ts")), "DISCLAIMER constant missing from lib/config.ts");

if (fails.length) {
  console.error(`launch:check — ${fails.length} missing launch deliverable(s):\n  ` + fails.map((f) => "✗ " + f).join("\n  "));
  process.exit(1);
}
console.log("launch:check OK — Tier-B launch deliverables present.");
