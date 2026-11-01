import type { HelpService } from "@/lib/schemas/corpus";
import { NATIONAL_HELP } from "@/lib/tripwire";

/**
 * Another state or territory, named in a question or a letter.
 *
 * Asked about a New South Wales fine, the app said "we're not sure" — correctly, it covers
 * Victoria and the Commonwealth — and then listed Fines Victoria and Victoria Legal Aid
 * (measured on the live site, 2026-11-01). Someone in Sydney needs the national finders.
 *
 * The short forms are matched in capitals only: "act", "sa" and "wa" are ordinary words, and
 * every letter about a decision mentions "the Act".
 */
const OTHER_PLACE_NAMES =
  /\b(new south wales|queensland|south australia|western australia|tasmania|northern territory|australian capital territory|sydney|brisbane|adelaide|perth|hobart|darwin|canberra)\b/i;
const OTHER_PLACE_CODES = /\b(NSW|QLD|Qld|SA|WA|NT|ACT|TAS|Tas)\b/;

export function namesOtherState(text: string): boolean {
  return OTHER_PLACE_NAMES.test(text) || OTHER_PLACE_CODES.test(text);
}

/** The help to show with "not covered": national finders when the matter is elsewhere. */
export function helpForPlace(text: string, services: HelpService[]): HelpService[] {
  return namesOtherState(text) ? NATIONAL_HELP : services;
}
