/**
 * A decision type's title, as a phrase that can sit inside a sentence.
 *
 * Titles are written to stand alone as headings — "A Victorian government decision",
 * "Fine or infringement notice", "Centrelink / social-security decision or debt" — and the
 * sentences that used them lowercased the whole title after a fixed "about a". So the memo
 * read "This note is about a a victorian government decision" and "about a centrelink /
 * social-security decision": a doubled article, and a proper noun knocked down to lowercase.
 * Reported from the live site.
 *
 * So: drop a leading article the title already carries, lowercase only the first letter and
 * only when the first word is not a name, and choose "a" or "an" from what follows.
 */

/** Words that open a title and must keep their capital: names, not common nouns. */
const PROPER = /^(Victorian|Victoria|Commonwealth|Centrelink|Australian|Australia|Services)\b/;

/** "Fine or infringement notice" → "fine or infringement notice"; "Centrelink …" unchanged. */
export function titleAsNoun(title: string): string {
  const bare = title.trim().replace(/^(a|an|the)\s+/i, "");
  if (!bare) return bare;
  if (PROPER.test(bare)) return bare;
  return bare.charAt(0).toLowerCase() + bare.slice(1);
}

/** "A Victorian government decision" → "a Victorian government decision". */
export function titleAsPhrase(title: string): string {
  const noun = titleAsNoun(title);
  if (!noun) return noun;
  return `${/^[aeiou]/i.test(noun) ? "an" : "a"} ${noun}`;
}
