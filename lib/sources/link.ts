/**
 * Source strings → readable label + real links.
 *
 * The corpus stores each source as one human string, and most carry the publisher's domain
 * either as a trailing segment ("Services Australia — Reviews and appeals —
 * servicesaustralia.gov.au") or inline ("… s 91ZZS; vcat.vic.gov.au; tenantsvic.org.au").
 * Showing that as flat text asks people to trust us and retype a domain. Parsing the domains
 * out lets "Where this comes from" link to the actual source so anyone can read it themselves
 * — which is the whole point of a grounded-or-silent product.
 *
 * We only ever link to the domain root: the corpus records the publisher, not a deep path, and
 * guessing a path would produce 404s. `https://` + domain is always safe.
 */

/** Australian gov/org domains dominate the corpus; keep the TLD list tight to avoid matching
 *  prose like "s 45" or "Act 1998". Longest-first so "gov.au" wins over "au". */
const DOMAIN = /\b((?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:gov\.au|org\.au|com\.au|net\.au|edu\.au|gov|org|com|net))\b/gi;

export interface SourceRef {
  /** The human label, with a trailing " — domain" stripped (it is shown as a link instead). */
  label: string;
  /** Every distinct domain found, in order, as an absolute link. */
  links: { domain: string; href: string }[];
}

export function parseSource(raw: string): SourceRef {
  const s = raw.trim();

  // Already an absolute URL: link it as-is, labelled by its host.
  if (/^https?:\/\//i.test(s)) {
    try {
      const u = new URL(s);
      const domain = u.host.replace(/^www\./, "");
      return { label: domain + (u.pathname !== "/" ? u.pathname : ""), links: [{ domain, href: s }] };
    } catch {
      return { label: s, links: [] };
    }
  }

  const seen = new Set<string>();
  const links: { domain: string; href: string }[] = [];
  for (const m of s.matchAll(DOMAIN)) {
    const domain = m[1]!.toLowerCase().replace(/^www\./, "");
    if (seen.has(domain)) continue;
    seen.add(domain);
    links.push({ domain, href: `https://${domain}` });
  }

  // Strip a trailing separator + domain ("… — vcat.vic.gov.au", "…; vcat.vic.gov.au") so the
  // label reads as prose; the domain is rendered separately as the link. Repeat for strings
  // that end in several domains. Never strip a domain that carries the label on its own.
  let label = s;
  for (;;) {
    const next = label.replace(
      new RegExp(`\\s*[—;,]\\s*(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+(?:gov\\.au|org\\.au|com\\.au|net\\.au|edu\\.au|gov|org|com|net)\\s*$`, "i"),
      "",
    ).trim();
    if (next === label || next.length === 0) break;
    label = next;
  }

  return { label, links };
}
