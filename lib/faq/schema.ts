import { z } from "zod";

/**
 * FAQ frontmatter (harness §8.1, §11.1). Each published FAQ is grounded (cites a corpus
 * entry + sources), human-reviewed before publish, and carries the disclaimer + a CTA.
 */
export const FaqFrontmatterSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  question: z.string().min(1),
  answer: z.string().min(1),
  /** The corpus entry this answer is grounded in (provenance). */
  entryId: z.string().min(1),
  category: z.string().optional(),
  sources: z.array(z.string()).min(1),
  related: z.array(z.string()).default([]),
  /** Date last checked by a human (null = being confirmed). */
  updated: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .default(null),
});
export type FaqFrontmatter = z.infer<typeof FaqFrontmatterSchema>;

export interface FaqEntry extends FaqFrontmatter {
  slug: string;
  body: string;
}
