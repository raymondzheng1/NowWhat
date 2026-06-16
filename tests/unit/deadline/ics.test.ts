import { describe, it, expect, afterEach } from "vitest";
import { buildReminderIcs } from "@/lib/deadline/ics";
import { __setNowForTests } from "@/lib/time/clock";

afterEach(() => __setNowForTests(null));

describe("ICS reminder", () => {
  it("builds a valid all-day VEVENT with reminders", () => {
    __setNowForTests(Date.parse("2026-06-16T00:00:00Z"));
    const ics = buildReminderIcs({ deadlineDate: "2026-06-29", title: "Time limit: Internal review" });
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("DTSTART;VALUE=DATE:20260629");
    expect(ics).toContain("TRIGGER:-P7D");
    expect(ics).toContain("TRIGGER:-P1D");
    expect(ics).toContain("END:VCALENDAR");
  });

  it("escapes the summary and contains no letter content", () => {
    const ics = buildReminderIcs({ deadlineDate: "2026-06-29", title: "Time limit: a, b; c" });
    expect(ics).toContain("SUMMARY:Time limit: a\\, b\\; c");
  });
});
