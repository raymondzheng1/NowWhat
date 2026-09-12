import { describe, it, expect } from "vitest";
import { SCHEME_QUESTIONS, questionsForScheme } from "@/lib/intake/scheme-questions";
import { listDataEntries, getDataEntry } from "@/lib/data";

/**
 * Scheme-specific intake questions, added 2026-09-12.
 *
 * A question asserts that its answer matters legally, so it is a claim like any other and
 * gets the same treatment: traced to a corpus sentence, then put through three independent
 * adversarial reviews. Twenty-six were drafted; three ship. That ratio is the system working
 * — the rest were asking for figures we cannot source, conclusions a person cannot reach
 * about their own case, or detail the memo would never print.
 */
describe("every scheme question is grounded, plain and actually used", () => {
  const all = Object.entries(SCHEME_QUESTIONS).flatMap(([scheme, qs]) =>
    qs.map((q) => ({ scheme, ...q })),
  );

  it("only names schemes we actually have", () => {
    const ids = new Set(listDataEntries().map((e) => e.id));
    for (const scheme of Object.keys(SCHEME_QUESTIONS)) {
      expect(ids.has(scheme), scheme).toBe(true);
    }
  });

  it("carries a quoted grounding, naming the file it came from", () => {
    for (const q of all) {
      expect(q.groundedIn, `${q.scheme}/${q.id}`).toMatch(/\.md/);
      expect(q.groundedIn, `${q.scheme}/${q.id}`).toMatch(/"/);
      expect(q.groundedIn.length, `${q.scheme}/${q.id}`).toBeGreaterThan(60);
    }
  });

  it("states no figure, period or deadline", () => {
    // Several of these entries have unconfirmed figures recorded in their notes. A question
    // is a place one could quietly reappear, phrased as a prompt rather than a claim.
    for (const q of all) {
      const text = `${q.label} ${q.hint}`;
      expect(text, `${q.scheme}/${q.id}`).not.toMatch(/\b\d+\s*(day|days|week|weeks|month|months|year|years)\b/i);
      expect(text, `${q.scheme}/${q.id}`).not.toMatch(/\$\s?\d/);
    }
  });

  it("gives no advice and asks for no conclusion", () => {
    for (const q of all) {
      const text = `${q.label} ${q.hint}`.toLowerCase();
      for (const banned of ["you should", "we recommend", "your best", "likely", "will succeed", "entitled to"]) {
        expect(text, `${q.scheme}/${q.id}: ${banned}`).not.toContain(banned);
      }
    }
  });

  it("asks for no identifying detail the memo does not use", () => {
    for (const q of all) {
      const text = `${q.label} ${q.hint}`.toLowerCase();
      for (const pii of ["date of birth", "customer reference", "crn", "tax file", "medicare number", "your address"]) {
        expect(text, `${q.scheme}/${q.id}: ${pii}`).not.toContain(pii);
      }
    }
  });

  it("is short enough to read on a phone, and asks one thing", () => {
    for (const q of all) {
      expect(q.label.split(/\s+/).length, `${q.scheme}/${q.id}`).toBeLessThanOrEqual(22);
      // "and" joining two questions is the double-barrelled failure the reviews rejected.
      expect(q.label, `${q.scheme}/${q.id}`).not.toMatch(/\?.*\?/);
    }
  });

  it("uses ids that are unique within a scheme", () => {
    for (const [scheme, qs] of Object.entries(SCHEME_QUESTIONS)) {
      expect(new Set(qs.map((q) => q.id)).size, scheme).toBe(qs.length);
    }
  });

  it("both catch-alls ask who decided, because both can only say 'the agency'", () => {
    // Shipping it for one and not the other would be arbitrary: the field is identical.
    for (const id of ["vic-generic", "cth-generic"]) {
      const q = questionsForScheme(id).find((x) => x.id === "deciding-body");
      expect(q, id).toBeDefined();
      expect(getDataEntry(id)!.avenue.ir.body).toBe("the agency that made the decision");
    }
  });

  it("a scheme with nothing grounded asks nothing extra", () => {
    // The right default. No question beats an ungrounded one, and four schemes ended here.
    expect(questionsForScheme("cth-centrelink")).toEqual([]);
    expect(questionsForScheme("vic-public-housing")).toEqual([]);
    expect(questionsForScheme("not-a-scheme")).toEqual([]);
  });

  it("the fines question names the stage words the corpus itself uses", () => {
    const q = questionsForScheme("vic-fines")[0]!;
    for (const word of ["infringement notice", "penalty reminder notice", "notice of final demand"]) {
      expect(q.hint.toLowerCase()).toContain(word);
    }
  });
});
