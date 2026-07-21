import { describe, it, expect } from "vitest";
import { parseSource } from "@/lib/sources/link";
import corpus from "@/corpus/index.json";
import legal from "@/corpus/legal/index.json";

describe("source links (Where this comes from)", () => {
  it("splits a trailing domain off the label and links it", () => {
    const r = parseSource("Services Australia — Reviews and appeals — servicesaustralia.gov.au");
    expect(r.label).toBe("Services Australia — Reviews and appeals");
    expect(r.links).toEqual([
      { domain: "servicesaustralia.gov.au", href: "https://servicesaustralia.gov.au" },
    ]);
  });

  it("keeps prose that only ends in a domain-less description", () => {
    const r = parseSource("VCAT — application for review of a decision");
    expect(r.label).toBe("VCAT — application for review of a decision");
    expect(r.links).toEqual([]);
  });

  it("finds several inline domains and de-duplicates them", () => {
    const r = parseSource("Residential Tenancies Act 1997 (Vic) s 91ZZS; vcat.vic.gov.au; tenantsvic.org.au");
    expect(r.links.map((l) => l.domain)).toEqual(["vcat.vic.gov.au", "tenantsvic.org.au"]);
    expect(r.label).toBe("Residential Tenancies Act 1997 (Vic) s 91ZZS");
  });

  it("handles an absolute URL", () => {
    const r = parseSource("https://www.vcat.vic.gov.au/steps");
    expect(r.links[0]!.href).toBe("https://www.vcat.vic.gov.au/steps");
    expect(r.links[0]!.domain).toBe("vcat.vic.gov.au");
  });

  it("never invents a path — links go to the domain root", () => {
    for (const l of parseSource("Fines Victoria — request a review — online.fines.vic.gov.au").links) {
      expect(l.href).toBe(`https://${l.domain}`);
    }
  });

  it("does not mistake legislation prose for a domain", () => {
    const r = parseSource("Victorian Civil and Administrative Tribunal Act 1998 (Vic) ss 45-46");
    expect(r.links).toEqual([]);
  });

  it("every corpus + legal source either links or is honest prose (never a broken href)", () => {
    const all = new Set<string>();
    for (const e of corpus.entries) {
      for (const s of e.sources ?? []) all.add(s);
    }
    for (const g of legal.grounds) for (const s of g.sources ?? []) all.add(s);
    for (const p of legal.processes) for (const s of p.sources ?? []) all.add(s);

    let linked = 0;
    for (const s of all) {
      const r = parseSource(s);
      expect(r.label.length).toBeGreaterThan(0);
      for (const l of r.links) expect(l.href).toMatch(/^https:\/\/[a-z0-9.-]+$|^https?:\/\//);
      if (r.links.length) linked++;
    }
    // The point of the change: most sources must actually be reachable.
    expect(linked / all.size).toBeGreaterThan(0.7);
  });
});
