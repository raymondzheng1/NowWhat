/**
 * The own-words gate — the primary control on a model-assisted letter.
 *
 * Every open-class word in a generated sentence must already appear inside THAT POINT'S OWN
 * QUOTE of what the person typed. The model may delete, reorder, split and re-punctuate. It
 * may not add. An embellished fact is, by definition, a word the person did not write, so
 * invention becomes structurally impossible rather than merely forbidden.
 *
 * Scoped to the quote, never to the whole account. Two reasons, both real:
 *   · whole-account scope lets a date at the top attach to an unrelated event at the bottom;
 *   · a one-box intake invites pasting the decision letter, and whole-account scope would
 *     then silently open the allow-list — for exactly the people most likely to paste it.
 *
 * CONNECTIVES is interpolated into the system prompt, so the prompt and the gate cannot
 * drift. Note what is deliberately absent: should, must, would, could, may, might, will,
 * can, because, therefore, so. Modals turn what happened into what ought to have happened;
 * causal connectives assert a why, which is always a guess.
 */
export const CONNECTIVES: ReadonlySet<string> = new Set([
  "i","me","my","myself","we","us","our","they","them","their","he","she","him","her",
  "it","its","this","that","these","those","there","here",
  "a","an","the",
  "and","but","or","then","also","not","no",
  "of","to","in","on","at","by","for","from","with","about","before","after","during",
  "when","while","until","since","again","still","yet","only","just","ever","never",
  "without","behind","into","out","over","under","off","back","down","up","away","next",
  "any","all","some","each","both","other","another","same","own",
  "is","are","was","were","be","been","am","do","does","did","have","has","had",
  "who","what","where","if",
]);

const CONTRACTIONS: Record<string, string> = {
  dont: "do not", didnt: "did not", doesnt: "does not", cant: "can not",
  couldnt: "could not", wouldnt: "would not", shouldnt: "should not", wont: "will not",
  isnt: "is not", arent: "are not", wasnt: "was not", werent: "were not",
  hasnt: "has not", havent: "have not", hadnt: "had not",
  im: "i am", ive: "i have", ill: "i will", id: "i would",
  thats: "that is", theyre: "they are", theyve: "they have", weve: "we have",
  youre: "you are", theres: "there is", hes: "he is", shes: "she is",
};

/** Irregular forms, so "told"/"tell" and "sent"/"send" are the same word on both sides. */
const IRREGULAR: Record<string, string> = {
  told: "tell", said: "say", sent: "send", paid: "pay", went: "go", gone: "go",
  took: "take", taken: "take", gave: "give", given: "give", got: "get", gotten: "get",
  made: "make", wrote: "write", written: "write", rang: "ring", rung: "ring",
  spoke: "speak", spoken: "speak", knew: "know", known: "know", saw: "see", seen: "see",
  heard: "hear", thought: "think", brought: "bring", bought: "buy", found: "find",
  left: "leave", lost: "lose", kept: "keep", felt: "feel", meant: "mean",
  ran: "run", came: "come", became: "become", began: "begin",
  children: "child", people: "person", men: "man", women: "woman",
  was: "be", were: "be", been: "be", am: "be", is: "be", are: "be",
};

/** Tokenise, fold curly punctuation, expand contractions. Applied to BOTH sides. */
export function tokens(s: string): string[] {
  const flat = s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‐-―]/g, "-");
  const out: string[] = [];
  for (const raw of flat.split(/[^a-z0-9'$./-]+/)) {
    // Strip punctuation that only ever ends a word. A dot must survive INSIDE a token
    // ($4,182.60, 3.5) but a sentence-final one made "it." a different word from "it",
    // which the quote then failed to cover.
    const w = raw.replace(/^['.\-/]+|['.\-/]+$/g, "");
    if (!w) continue;
    const bare = w.replace(/'/g, "");
    const expanded = CONTRACTIONS[bare];
    if (expanded) out.push(...expanded.split(" "));
    else out.push(bare);
  }
  return out.filter(Boolean);
}

/**
 * Light, symmetric stemming. Applied identically to sentence and quote, so an error that
 * merges two forms merges them on both sides. Over-merging is the only real risk and it is
 * bounded: it can admit a near-synonym, never a new fact.
 */
export function stem(raw: string): string {
  const x = raw.replace(/[^a-z0-9$./-]/g, "");
  if (!x) return x;
  if (IRREGULAR[x]) return IRREGULAR[x]!;
  if (/^\d/.test(x)) return x; // numbers and dates are compared exactly
  return x
    .replace(/(ies)$/, "y")
    .replace(/(sses|shes|ches|xes)$/, "s")
    .replace(/([^s])s$/, "$1")
    .replace(/(ing|ed)$/, "")
    .replace(/e$/, "");
}

export interface OwnWordsResult {
  ok: boolean;
  /** Words in the sentence that appear neither in the quote nor in the connective list. */
  novel: string[];
}

/**
 * Does every open-class word in `sentence` come from `quote`?
 *
 * The novel list is for a FIXED remediation message only. It must never be echoed back into
 * a prompt or out of an API response: a novel token is most often a near-miss on a real word
 * — a mangled surname, a misspelled agency — and that is the person's own data.
 */
export function checkOwnWords(sentence: string, quote: string): OwnWordsResult {
  const allowed = new Set(tokens(quote).map(stem));
  const novel: string[] = [];
  for (const raw of tokens(sentence)) {
    if (CONNECTIVES.has(raw)) continue;
    const s = stem(raw);
    if (!s || allowed.has(s)) continue;
    if (CONNECTIVES.has(s)) continue;
    novel.push(raw);
  }
  return { ok: novel.length === 0, novel };
}

/** The quote must be a continuous, character-for-character run of the person's own text. */
export function checkQuoteAnchored(quote: string, account: string): boolean {
  const norm = (s: string) =>
    s.normalize("NFKD").replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim();
  const q = norm(quote);
  return q.length > 0 && norm(account).includes(q);
}

/**
 * Hedges must survive. The own-words gate permits DELETION, and a hedge is deleted rather
 * than added — so a sentence can pass every word check while sounding far more certain than
 * what the person actually wrote. Confidence they did not express is an invention too.
 */
const HEDGES = [
  "i think","i thought","maybe","might","perhaps","probably","i reckon","i guess",
  "about","around","roughly","or so","i believe","i'm not sure","im not sure",
  "i can't remember","i cant remember","i don't remember","i dont remember",
  "as far as i","i assume","apparently","seemed","seems","sort of","kind of",
  "they told me","she told me","he told me","my worker said","someone said",
];

export function checkHedgePreserved(sentences: string[], quote: string): boolean {
  const q = quote.toLowerCase();
  const s = sentences.join(" ").toLowerCase();
  for (const h of HEDGES) {
    if (q.includes(h) && !s.includes(h)) return false;
  }
  return true;
}

/**
 * Terms of art, banned unconditionally — even when the person used them first. A lay person
 * writing "they were biased" is describing a feeling; the same words under our heading, in a
 * letter to the office that decided, read as a legal allegation they must then support.
 */
const TERMS_OF_ART = [
  "unfair","unfairly","unreasonable","unreasonably","unlawful","illegal","invalid",
  "breach","breached","denied","entitled","entitlement","duty","failed to","should have",
  "ought","required to","improperly","wrongly","disregarded","bias","biased",
  "natural justice","procedural fairness","relevant consideration","irrelevant",
  "jurisdiction","ultra vires","no evidence","bad faith","discriminat",
];

export function checkNoLegalConclusion(sentences: string[]): { ok: boolean; hit?: string } {
  const s = sentences.join(" ").toLowerCase();
  for (const t of TERMS_OF_ART) if (s.includes(t)) return { ok: false, hit: t };
  return { ok: true };
}

/** Never assert an entitlement to time. A reported event ("they gave me 14 days") is fine. */
const TIME_CLAIM =
  /\b(i|we)\s+(have|had|has|get|got|am entitled to|are entitled to)\s+\d+\s*(day|days|week|weeks|month|months)\b|\bwithin\s+\d+\s*(day|days|week|weeks|month|months)\s+(i|we|you)\b|\bdeadline is\b|\btime limit is\b/i;

export function checkNoTimeLimitClaim(sentences: string[]): boolean {
  return !TIME_CLAIM.test(sentences.join(" "));
}

/** No case citation ever reaches a letter a self-represented person sends. */
const CASE_CITATION = /\b[A-Z][A-Za-z'’-]+\s+v\s+[A-Z]|\(\d{4}\)\s*\d+\s*[A-Z]{2,5}|\[\d{4}\]\s*[A-Z]{2,6}\s*\d+/;

export function checkNoCaseCitation(sentences: string[]): boolean {
  return !CASE_CITATION.test(sentences.join(" "));
}

/**
 * Is the person writing about someone else? "I" is a connective, so a third-party account
 * converts to first person while passing every word gate — and a letter in the wrong voice
 * is worse than no letter. Detected before the call, so nothing is sent.
 */
const THIRD_PARTY =
  /\b(my (mum|mother|dad|father|son|daughter|husband|wife|partner|friend|client|brother|sister|nan|pop|grandmother|grandfather)|on behalf of|for my (mum|mother|dad|father|son|daughter)|i am helping|im helping|i'm helping|she got|he got|they got a letter)\b/i;

export function looksThirdParty(account: string): boolean {
  return THIRD_PARTY.test(account);
}

/**
 * Disclosures that may harm the person if they go to the deciding agency in writing — cash
 * work, family violence, child protection, criminal exposure, immigration status, or an
 * allegation about a named officer. Not dropped and not auto-included: surfaced, with a
 * plain reason, defaulting to OFF so the person chooses.
 */
const SENSITIVE: { id: string; re: RegExp }[] = [
  { id: "cash-work", re: /\b(cash in hand|cash job|paid cash|under the table|didn'?t declare|did not declare)\b/i },
  { id: "family-violence", re: /\b(family violence|domestic violence|dv|avo|intervention order|restraining order|he hit|she hit|abusive)\b/i },
  { id: "child-protection", re: /\b(child protection|dhhs|dffh|child safety|my kids were taken|removed my child)\b/i },
  { id: "criminal", re: /\b(police|charged|court date|fraud|prosecut|bail|arrest)\b/i },
  { id: "immigration", re: /\b(visa|bridging|immigration|not a citizen|overstay)\b/i },
  { id: "person", re: /\b(lied|lying|made it up|had it in for me|deliberately|on purpose|racist)\b/i },
];

export function sensitiveFlags(text: string): string[] {
  return SENSITIVE.filter((s) => s.re.test(text)).map((s) => s.id);
}
