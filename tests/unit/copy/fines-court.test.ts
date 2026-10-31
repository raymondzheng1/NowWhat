import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import messages from "@/lib/i18n/messages/en.json";
import corpus from "@/corpus/index.json";

const ROOT = resolve(__dirname, "../../..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");
const rights = messages.rights as unknown as Record<string, string>;

type Pathway = { name: string; deadline: string; howToStart: string; cost: string; source: string };
const fines = (corpus as unknown as { entries: { id: string; pathways: Pathway[]; plainLanguageExplainer: string }[] })
  .entries.find((e) => e.id === "vic-fines")!;
const pathway = (re: RegExp) => fines.pathways.find((p) => re.test(p.name))!;

/** Every published place that talks about a Victorian fine's time limits. */
const published = (): [string, string][] => [
  ...readdirSync(resolve(ROOT, "content/faq"))
    .filter((f) => f.endsWith(".md"))
    .map((f): [string, string] => [`content/faq/${f}`, read(`content/faq/${f}`)]),
  ["corpus/pathways/vic-fines.md", read("corpus/pathways/vic-fines.md")],
  ["lib/i18n/messages/en.json", read("lib/i18n/messages/en.json")],
];

/**
 * VICTORIAN FINES: THE COURT HEARING AND ITS TIME LIMITS, CHECKED AGAINST THE ACTS.
 *
 * QA of 2026-10-31 against the authorised versions on legislation.vic.gov.au — Infringements
 * Act 2006 (v067), Fines Reform Act 2014 (v035), Road Safety Act 1986 (v237), Criminal
 * Procedure Act 2009 (v115) — and Victoria Legal Aid (updated 19 May 2026).
 *
 * The serious finding: the app said the court and review options close "before the fine is
 * registered — that is, before a 'Notice of Final Demand'". They are not the same moment. The
 * right to elect court lasts "until ... registered with the Director" (IA s 16(1)); registration
 * can happen once the Penalty Reminder Notice's pay period has passed (FRA s 16(2)); and the
 * Final Demand is served on a fine ALREADY registered (FRA s 23(1)). So someone waiting for a
 * Final Demand, as the app told them they could, may already be out of time.
 */
describe("Victorian fines: the time limit is registration, not the Final Demand", () => {
  it("never equates being registered with getting a Notice of Final Demand", () => {
    const equation =
      /registered[^.]{0,40}(that is|i\.e\.|\()[^.]{0,30}final demand|before (the fine|it|your fine) becomes a[^.]{0,6}notice of final demand/i;
    for (const [where, text] of published()) {
      expect(text, `${where} equates registration with the Final Demand`).not.toMatch(equation);
    }
  });

  it("says registration can come before any Notice of Final Demand", () => {
    const court = pathway(/any other fine/);
    expect(court.deadline).toMatch(/until the fine is registered/i);
    expect(court.deadline).toMatch(/before any Notice of Final Demand/i);
    expect(fines.plainLanguageExplainer).toMatch(/before any Notice of Final Demand/i);
  });

  it("cites the sections that carry the rule", () => {
    expect(pathway(/any other fine/).source).toMatch(/Infringements Act 2006 \(Vic\) s 16/);
    expect(pathway(/any other fine/).source).toMatch(/Fines Reform Act 2014 \(Vic\) ss 16, 23/);
  });
});

describe("excessive-speed, drink-driving and drug-driving fines work differently", () => {
  // Road Safety Act 1986 (Vic) s 89A(2): these notices take effect "28 days after the date of
  // the notice, as a conviction" unless the person objects in writing (s 89A(4)-(5)). The
  // Infringements Act's election (s 16(2)(a)) and internal review (s 21(1)(a)) do not apply.
  const driving = () => pathway(/drink-driving/);

  it("says the route is a written objection, and what happens without one", () => {
    expect(driving().howToStart).toMatch(/written notice of objection/i);
    expect(driving().deadline).toMatch(/takes effect as a conviction/i);
    expect(driving().deadline).toMatch(/28 days after the date printed on the notice, not the day you got it/i);
    expect(driving().source).toMatch(/Road Safety Act 1986 \(Vic\) ss 89A, 89B, 89C, 89D/);
  });

  it("does not offer them an internal review", () => {
    expect(driving().deadline).toMatch(/no review/i);
    expect(pathway(/five grounds/).deadline).toMatch(
      /not available for excessive-speed, drink-driving or drug-driving fines/i,
    );
  });

  it("is flagged in the dispute-a-fine article too", () => {
    expect(read("content/faq/dispute-a-fine-in-victoria.md")).toMatch(
      /drink-driving and drug-driving fines work differently/i,
    );
  });
});

describe("what a court hearing can do, stated and sourced", () => {
  // Victoria Legal Aid (updated 19 May 2026): dismiss the charge; record a conviction; order an
  // amount "more or less than the original amount of the fine". Costs: Criminal Procedure Act
  // 2009 (Vic) s 401 (discretionary) and s 403 (a convicted accused pays the filing fee).
  const OUTCOMES = /dismiss[\s\S]*conviction[\s\S]*more or less than the fine[\s\S]*costs/i;

  it("says the same thing everywhere it is said", () => {
    expect(rights.courtIsNot).toMatch(OUTCOMES);
    expect(rights.focusCourt).toMatch(OUTCOMES);
    expect(pathway(/any other fine/).cost).toMatch(OUTCOMES);
    expect(pathway(/drink-driving/).cost).toMatch(OUTCOMES);
    expect(read("lib/draft/warnings.ts")).toMatch(
      /The court can dismiss it, or find you guilty, record a conviction, and order you to pay more or less than the fine, plus costs\./,
    );
  });

  it("no longer says 'better or worse' without saying how", () => {
    for (const [where, text] of published()) {
      expect(text, where).not.toMatch(/can end better than the (decision|notice) you have, or worse/i);
    }
  });

  it("says the court hears the CHARGE — the Act's own word (IA s 40)", () => {
    expect(rights.courtIsNot).toMatch(/hears the charge itself/i);
    expect(rights.focusCourt).toMatch(/hears the charge itself/i);
  });

  it("says asking for a hearing ends a review in progress (IA s 27)", () => {
    expect(rights.courtIsNot).toMatch(/any review you asked for ends/i);
  });
});

describe("the details around the court option", () => {
  it("uses age at the time of the offence for the Children's Court (IA s 3(1))", () => {
    for (const p of fines.pathways.filter((x) => /Children's Court/.test(JSON.stringify(x)))) {
      expect(JSON.stringify(p)).toMatch(/under 18 when the offence happened/);
    }
  });

  it("states the two conditions on the 'unaware' ground (IA ss 22(1)(d), 25(6)-(7))", () => {
    const unaware = pathway(/did not know about the fine/);
    expect(unaware.deadline).toMatch(/not handed to you in person/i);
    expect(unaware.deadline).toMatch(/the review is refused, you then have 14 days/i);
  });
});

describe("second QA round, checked against the Acts", () => {
  it("does not say there is only one review per fine (IA s 22(2)(e), (3)(e); FRA s 32)", () => {
    const all = published().map(([, t]) => t).join(" ");
    expect(all).not.toMatch(/only one review is allowed per fine/i);
    expect(pathway(/five grounds/).deadline).toMatch(/After a Notice of Final Demand you can still ask Fines Victoria for a review/i);
  });

  it("does not say MOST options close at registration — only court does (FRA s 32)", () => {
    for (const [where, text] of published()) {
      expect(text, where).not.toMatch(/most options close once the fine is registered/i);
    }
  });

  it("says what happens to the licence, and that paying does not stop it (RSA ss 89C, 89D)", () => {
    expect(pathway(/drink-driving/).deadline).toMatch(/or just pay, the notice takes effect as a conviction and you lose your licence/i);
    expect(read("content/faq/dispute-a-fine-in-victoria.md")).toMatch(/Paying does not stop this/);
  });

  it("lists all three things an objection must say (RSA s 89A(5))", () => {
    expect(pathway(/drink-driving/).howToStart).toMatch(/refuse to pay[\s\S]*court to deal with it[\s\S]*whether or not you plan to defend the charge/i);
  });

  it("offers more time to object to someone who never got the notice (RSA s 89B)", () => {
    expect(pathway(/drink-driving/).deadline).toMatch(/14 days to ask for more time to object/i);
  });

  it("sends traffic and toll 'did not know' cases to the extension, with a declaration (RSA s 67; IA s 21(2))", () => {
    const u = pathway(/did not know about the fine/);
    expect(u.deadline).toMatch(/traffic fines, and for toll fines, you ask Fines Victoria for 28 more days/i);
    expect(u.howToStart).toMatch(/for traffic and toll fines it is required/i);
    expect(u.source).toMatch(/Road Safety Act 1986 \(Vic\) s 67/);
  });

  it("states the special-circumstances test as the Act does (IA s 3A)", () => {
    const faq = read("content/faq/can-i-get-a-fine-reviewed-for-special-circumstances-in-victoria.md");
    expect(faq).not.toMatch(/At the time you got the fine/);
    expect(faq).toMatch(/much harder for you to understand that what you did was an offence/);
    expect(faq).toMatch(/long-term circumstances/i);
  });

  it("lists who can get a Work and Development Permit as the Act does (FRA s 10AA(2))", () => {
    const faq = read("content/faq/how-do-i-get-more-time-to-pay-a-fine-in-victoria.md");
    expect(faq).toMatch(/acute financial hardship/);
    expect(faq).not.toMatch(/for example illness, disability/);
  });

  it("does not tell people there is no time limit for the Ombudsman", () => {
    expect(read("corpus/pathways/vic-fines.md")).not.toMatch(/no strict time limit/i);
  });

  it("tells the court-enquiry letter's reader not to wait for a reply (IA s 16(1))", () => {
    expect(read("lib/draft/warnings.ts")).toMatch(/Do not wait for their reply to act/);
  });
});
