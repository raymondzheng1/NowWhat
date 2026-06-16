import { z } from "zod";
import { LOCALES } from "@/lib/config";

/** Zod at every IO boundary (harness §2.4). User text is DATA, never instructions (§6.5). */

const Locale = z.enum(LOCALES).default("en");

// --- /api/ask ---
export const AskRequestSchema = z.object({
  question: z.string().trim().min(3).max(2000),
  locale: Locale,
});
export type AskRequest = z.infer<typeof AskRequestSchema>;

// --- /api/decode ---
// Either pasted text OR an uploaded file (multipart). Text path always works.
export const DecodeTextRequestSchema = z.object({
  text: z.string().trim().min(10).max(20000),
  locale: Locale,
});
export type DecodeTextRequest = z.infer<typeof DecodeTextRequestSchema>;

// --- /api/deadline ---
export const DeadlineRequestSchema = z.object({
  entryId: z.string().trim().min(1),
  pathwayName: z.string().trim().min(1),
  /** The date on the decision letter (YYYY-MM-DD). Never stored. */
  decisionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type DeadlineRequest = z.infer<typeof DeadlineRequestSchema>;

// --- /api/draft ---
export const DraftRequestSchema = z.object({
  entryId: z.string().trim().min(1),
  kind: z.enum(["reasons-request", "review-application"]),
  /** Optional non-identifying context the user chooses to include. Never stored. */
  context: z.string().trim().max(4000).optional(),
  locale: Locale,
});
export type DraftRequest = z.infer<typeof DraftRequestSchema>;

// --- Shared answer envelope returned by grounded endpoints ---
export const SourceRefSchema = z.object({
  label: z.string(),
  citation: z.string(),
  entryId: z.string(),
});
export type SourceRef = z.infer<typeof SourceRefSchema>;

/** Every grounded response either resolves to an answer or routes to help. */
export const GroundedStatusSchema = z.enum([
  "answered", // grounded answer passed verification
  "not-covered", // no corpus entry / verification exhausted → get help
  "blocked", // cost guard / rate limit (fail-closed)
]);
export type GroundedStatus = z.infer<typeof GroundedStatusSchema>;

export const ApiErrorSchema = z.object({
  ok: z.literal(false),
  status: GroundedStatusSchema,
  message: z.string(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
