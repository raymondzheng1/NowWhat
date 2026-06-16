import { describe, it, expect } from "vitest";
import { validateFaqDraft, type FaqDraft } from "@/lib/faq/validate";
import { getEntry } from "@/lib/corpus/index";

const renting = getEntry("vic-renting")!;

const clean: FaqDraft = {
  slug: "a-fresh-renting-question",
  question: "Can I challenge a rent increase in Victoria?",
  answer:
    "Yes. You may be able to ask Consumer Affairs Victoria for a free check within 30 days. The rules give you ways to have a high rent looked at, and free help is available.",
  description: "How to have a Victorian rent increase checked for free, and where to get help.",
  body:
    "## Ask for a free check\nYou can ask Consumer Affairs Victoria to look at the increase. They check the condition of the place and the rent for similar nearby homes. [Work out your options](/start).\n\n## What can help\nKeep the notice, your rental agreement, and your rent records so the increase can be checked fairly. Free advice is available from Tenants Victoria, and a free dispute service can take it further if you still disagree.",
};

describe("FAQ draft gates", () => {
  it("passes a clean, grounded, advice-free draft", () => {
    expect(validateFaqDraft({ draft: clean, entry: renting, publishedSlugs: [] })).toEqual([]);
  });

  it("flags first-person advice", () => {
    const f = validateFaqDraft({
      draft: { ...clean, answer: "You should take your rental provider to VCAT straight away." },
      entry: renting,
      publishedSlugs: [],
    });
    expect(f.some((x) => x.gate === "no-advice")).toBe(true);
  });

  it("flags a fabricated deadline not grounded in the entry", () => {
    const f = validateFaqDraft({
      draft: { ...clean, body: `${clean.body}\nYou must apply within 99 days.` },
      entry: renting,
      publishedSlugs: [],
    });
    expect(f.some((x) => x.gate === "no-fabricated-deadline")).toBe(true);
  });

  it("flags a missing /start CTA and a missing section", () => {
    const f = validateFaqDraft({
      draft: { ...clean, body: "Just a paragraph with no heading and no call to action that is long enough to pass the length check easily." },
      entry: renting,
      publishedSlugs: [],
    });
    expect(f.some((x) => x.gate === "cta")).toBe(true);
    expect(f.some((x) => x.gate === "structure")).toBe(true);
  });

  it("flags a duplicate of an already-published slug", () => {
    const f = validateFaqDraft({ draft: clean, entry: renting, publishedSlugs: [clean.slug] });
    expect(f.some((x) => x.gate === "dedupe")).toBe(true);
  });
});
