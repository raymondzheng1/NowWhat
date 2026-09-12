/**
 * The memo's own QA gate.
 *
 * `verifyOutput` already applies the shared gates — no advice, no prediction, no out-of-corpus
 * fact, source-binding, jurisdiction, reading level. This adds the one check that matters
 * most for a document a person hands to a lawyer, and that a general gate cannot make:
 *
 *   EVERY CASE AND EVERY ACT NAMED IN THE MEMO MUST HAVE COME FROM OUR KNOWLEDGE BASE.
 *
 * A fabricated citation is the single most damaging thing this product could produce. It is
 * also the failure mode language models are most known for, it looks exactly like a real
 * citation, and a self-represented person has no way to tell the difference. A duty lawyer
 * would catch it — but only after the person had relied on it.
 *
 * So the rule is allow-list, not blocklist: anything shaped like a citation that is not in
 * the supplied context is a rejection, whether or not it happens to be a real case. The model
 * is not permitted to be right by accident.
 */

/** "Kioa v West", "Minister for Immigration v Li" — a party-v-party case name. */
const CASE_SHAPE = /\b([A-Z][\w'’.-]*(?:\s+[A-Z][\w'’.-]*){0,6})\s+v\.?\s+([A-Z][\w'’.-]*(?:\s+[A-Z][\w'’.-]*){0,6})/g;
/** "Migration Act 1958", "Residential Tenancies Act 1997". */
const ACT_SHAPE = /\b([A-Z][\w'’-]*(?:\s+[A-Z][\w'’-]*|\s+(?:and|of|for|the)\b)*\s+Act\s+\d{4})/g;
/** "s 5", "section 45", "ss 268-269". */
const SECTION_SHAPE = /\b(?:ss?\.?\s?\d+[A-Za-z]?(?:\s?[-–]\s?\d+[A-Za-z]?)?|section\s+\d+[A-Za-z]?)\b/gi;

const norm = (s: string) => s.toLowerCase().replace(/[\s.,'’-]+/g, " ").trim();

export interface MemoQaFailure {
  gate: "invented-citation" | "invented-act" | "invented-section";
  detail: string;
}

/**
 * @param text    everything the model wrote, concatenated
 * @param allowed the corpus context it was given, plus the source strings — the only place a
 *                citation may legitimately have come from
 */
export function checkMemoCitations(text: string, allowed: string): MemoQaFailure[] {
  const haystack = norm(allowed);
  const failures: MemoQaFailure[] = [];
  const seen = new Set<string>();

  const scan = (
    re: RegExp,
    gate: MemoQaFailure["gate"],
    pick: (m: RegExpMatchArray) => string,
  ) => {
    for (const m of text.matchAll(re)) {
      const raw = pick(m).trim();
      const key = `${gate}:${norm(raw)}`;
      if (!raw || seen.has(key)) continue;
      seen.add(key);
      if (!haystack.includes(norm(raw))) {
        failures.push({ gate, detail: raw });
      }
    }
  };

  // Case names are matched with the words that happen to precede them, because "v" is the
  // only fixed part and JS gives no clean way to say "start at the party name". So "In Kioa
  // v West" matches as a unit — and checking THAT against the allow-list would reject an
  // honest citation for the crime of following the word "In". Instead, try each suffix of
  // the left-hand side: if any of them names a case we supplied, it is ours.
  for (const m of text.matchAll(CASE_SHAPE)) {
    const left = (m[1] ?? "").trim();
    const right = (m[2] ?? "").trim().replace(/[.,;:]+$/, "");
    if (!left || !right) continue;
    const words = left.split(/\s+/);
    let allowedForm = "";
    for (let i = 0; i < words.length; i++) {
      const candidate = `${words.slice(i).join(" ")} v ${right}`;
      if (haystack.includes(norm(candidate))) {
        allowedForm = candidate;
        break;
      }
    }
    // Dedupe on the party names, not on the surrounding prose, so one invented case
    // repeated three times in three sentences is reported once.
    const key = `invented-citation:${norm(`${words[words.length - 1]} v ${right}`)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (!allowedForm) {
      failures.push({ gate: "invented-citation", detail: `${left} v ${right}` });
    }
  }
  scan(ACT_SHAPE, "invented-act", (m) => m[1] ?? m[0]);
  // Sections are checked as bare tokens: a section number that appears nowhere in the
  // context is invented even when the Act around it is real, and "s 5" of the wrong Act is
  // the kind of error that survives a casual read.
  scan(SECTION_SHAPE, "invented-section", (m) => m[0]);

  return failures;
}
