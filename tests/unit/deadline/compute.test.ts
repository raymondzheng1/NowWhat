import { describe, it, expect, afterEach } from "vitest";
import { computeDeadline } from "@/lib/deadline/compute";
import { __setNowForTests } from "@/lib/time/clock";
import { verifiedEntry } from "@/tests/fixtures/entries";
import { getEntry } from "@/lib/corpus/index";

afterEach(() => __setNowForTests(null));

describe("deadline computation (verified-only)", () => {
  it("computes a concrete date + days remaining for a verified deadline", () => {
    __setNowForTests(Date.parse("2026-06-16T00:00:00Z"));
    const r = computeDeadline(verifiedEntry, "Internal review", "2026-06-01");
    expect(r?.renderable).toBe(true);
    if (r?.renderable) {
      expect(r.deadlineDate).toBe("2026-06-29"); // 1 Jun + 28 days
      expect(r.daysRemaining).toBe(13);
      expect(r.passed).toBe(false);
    }
  });

  it("flags a deadline already passed", () => {
    __setNowForTests(Date.parse("2026-07-10T00:00:00Z"));
    const r = computeDeadline(verifiedEntry, "Internal review", "2026-06-01");
    expect(r?.renderable && r.passed).toBe(true);
  });

  it("returns a non-renderable, honest result for a seed entry (no verified figure)", () => {
    const seed = getEntry("centrelink-debt")!;
    const r = computeDeadline(seed, seed.pathways[0]!.name, "2026-06-01");
    expect(r?.renderable).toBe(false);
  });

  it("returns null for an unknown pathway", () => {
    expect(computeDeadline(verifiedEntry, "No Such Pathway", "2026-06-01")).toBeNull();
  });
});
