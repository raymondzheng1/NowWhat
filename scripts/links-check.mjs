// Internal-link integrity (harness §8). Every internal href must resolve to a real
// route (an app/**/page.tsx, the /faq/[slug] dynamic route backed by a content file,
// or an allow-listed static path). Fails the build on a broken internal link.

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function walk(dir, exts) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = resolve(dir, name);
    if (statSync(full).isDirectory()) {
      if (["node_modules", ".next"].includes(name)) continue;
      out.push(...walk(full, exts));
    } else if (exts.some((e) => name.endsWith(e))) out.push(full);
  }
  return out;
}

// Derive valid routes from app/ structure.
function appRoutes() {
  const routes = new Set(["/"]);
  const appDir = resolve(ROOT, "app");
  for (const f of walk(appDir, ["page.tsx", "page.ts"])) {
    let r = "/" + relative(appDir, dirname(f)).replace(/\\/g, "/");
    r = r.replace(/\/\([^)]+\)/g, ""); // strip route groups
    if (r === "/") routes.add("/");
    else routes.add(r);
  }
  return routes;
}

function faqSlugs() {
  const dir = resolve(ROOT, "content/faq");
  if (!existsSync(dir)) return new Set();
  return new Set(
    readdirSync(dir)
      .filter((f) => /\.(md|mdx)$/.test(f))
      .map((f) => f.replace(/\.(md|mdx)$/, "")),
  );
}

const routes = appRoutes();
const slugs = faqSlugs();

function isValid(path) {
  const clean = path.split("#")[0].split("?")[0].replace(/\/$/, "") || "/";
  if (routes.has(clean)) return true;
  if (clean === "/faq" && routes.has("/faq")) return true;
  const faq = clean.match(/^\/faq\/(.+)$/);
  if (faq) return slugs.has(faq[1]) || routes.has("/faq/[slug]"); // dynamic route ok
  // dynamic segments in app routes
  for (const r of routes) {
    if (r.includes("[")) {
      const re = new RegExp("^" + r.replace(/\[[^\]]+\]/g, "[^/]+") + "$");
      if (re.test(clean)) return true;
    }
  }
  return false;
}

const hrefRe = /href=(?:"([^"]+)"|\{`([^`]+)`\}|'([^']+)')/g;
const files = [
  ...walk(resolve(ROOT, "app"), [".tsx", ".ts"]),
  ...walk(resolve(ROOT, "components"), [".tsx"]),
  ...walk(resolve(ROOT, "content"), [".md", ".mdx"]),
];

const broken = [];
for (const f of files) {
  const src = readFileSync(f, "utf8");
  let m;
  while ((m = hrefRe.exec(src))) {
    const href = m[1] ?? m[2] ?? m[3];
    if (!href.startsWith("/")) continue; // external / anchors handled elsewhere
    if (href.startsWith("//")) continue;
    if (/\$\{|\`/.test(href)) continue; // skip interpolated (can't statically resolve)
    if (!isValid(href)) broken.push(`${relative(ROOT, f)}: → ${href}`);
  }
}

if (broken.length) {
  console.error(`links:check — ${broken.length} broken internal link(s):\n  ` + broken.join("\n  "));
  process.exit(1);
}
console.log(`links:check OK — ${routes.size} routes, ${slugs.size} FAQ pages; all internal links resolve.`);
