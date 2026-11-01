import { describe, it, expect } from "vitest";
import { listEntries } from "@/lib/corpus/index";
import { buildDraft, type DraftKind } from "@/lib/draft/build";
import { assemble, bodyOnly, splitBones } from "@/lib/letter/bones";
import { SELF_WARNING_HEADING } from "@/lib/draft/warnings";

const CASE_KINDS: DraftKind[] = ["internal-review-request", "merits-review-application", "judicial-review-application"];

describe("the case document's bones", () => {
  it("splits every review draft into head, body and sign-off, and puts it back together", () => {
    for (const entry of listEntries(true)) {
      for (const kind of CASE_KINDS) {
        const draft = buildDraft(entry, kind, "Nobody told me about the complaint.", { decisionDate: "2026-10-14" });
        const b = splitBones(draft.body);
        expect(b, `${entry.id} ${kind}`).not.toBeNull();
        expect(b!.head).toMatch(/Date of the decision: 14 October 2026/);
        // A note to the person stays in the head, so it is printed exactly where it was.
        if (draft.body.includes(SELF_WARNING_HEADING)) expect(b!.head).toContain(SELF_WARNING_HEADING);
        expect(b!.tail).toMatch(/^(Yours faithfully,|Signed:)/);
        expect(b!.body).toContain("Nobody told me about the complaint.");
        expect(assemble(b!, b!.body).replace(/\s+/g, " ")).toBe(draft.body.replace(/\s+/g, " "));
      }
    }
  });

  it("takes back out any bones the model copied anyway, so nothing prints twice", () => {
    const draft = buildDraft(listEntries(true)[0]!, "judicial-review-application", "x", { decisionDate: "2026-10-14" });
    const b = splitBones(draft.body)!;
    const copied = `${b.head}\n\nThe decision and its reasons\nThe council cancelled my permit.\n\n${b.tail}`;
    const body = bodyOnly(copied, b);
    expect(body).toBe("The decision and its reasons\nThe council cancelled my permit.");
    const doc = assemble(b, body);
    expect(doc.split("Signed:").length).toBe(2);
    expect(doc.split(SELF_WARNING_HEADING).length).toBe(2);
  });
});
