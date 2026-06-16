import { z } from "zod";
import { LOCALES } from "@/lib/config";

/**
 * localStorage is the ONLY client state (TECHNICAL_SPEC §4). Single-device only.
 * NOTHING about the user's letter is persisted server-side; this is the user's
 * own copy kept on their own device, which they can clear at any time.
 */

export const ReminderPrefsSchema = z.object({
  /** ISO date of the computed deadline the user chose to be reminded about. */
  deadlineDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  label: z.string().max(200).optional(),
});

/** The current working session the user can keep on their device. */
export const LocalSessionSchema = z.object({
  version: z.literal(1),
  locale: z.enum(LOCALES).default("en"),
  /** Last matched corpus entry id (NOT the letter text). */
  entryId: z.string().optional(),
  /** A draft the user is editing (their own copy, on their device). */
  draft: z.string().optional(),
  reminder: ReminderPrefsSchema.optional(),
  /** Whether the user accepted the analytics/consent choice. */
  analyticsConsent: z.boolean().optional(),
});
export type LocalSession = z.infer<typeof LocalSessionSchema>;

export const STORAGE_KEY = "whatnow:session:v1";
