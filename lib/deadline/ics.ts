import { now } from "@/lib/time/clock";

/**
 * Hand-rolled ICS (RFC 5545) for a no-account deadline reminder (PRD §3, §6.4).
 * All-day event on the deadline with reminders a week and a day before. Contains only
 * what the user chose to put in the label — no letter content, no PII beyond that.
 */

function fmtDate(isoDate: string): string {
  return isoDate.replace(/-/g, ""); // YYYYMMDD
}

function fmtStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escape(s: string): string {
  return s.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
}

export function buildReminderIcs(opts: {
  deadlineDate: string; // YYYY-MM-DD
  title: string;
  description?: string;
}): string {
  const start = fmtDate(opts.deadlineDate);
  const endDate = new Date(opts.deadlineDate + "T00:00:00Z");
  endDate.setUTCDate(endDate.getUTCDate() + 1);
  const end = fmtDate(endDate.toISOString().slice(0, 10));
  const stamp = fmtStamp(now());
  // Stable, content-free UID (no PII): derived from the date only.
  const uid = `whatnow-${start}@whatnow.local`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//What Now//Deadline Reminder//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:${escape(opts.title)}`,
    opts.description ? `DESCRIPTION:${escape(opts.description)}` : "",
    "BEGIN:VALARM",
    "TRIGGER:-P7D",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escape(opts.title)} (in one week)`,
    "END:VALARM",
    "BEGIN:VALARM",
    "TRIGGER:-P1D",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escape(opts.title)} (tomorrow)`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return lines.join("\r\n") + "\r\n";
}
