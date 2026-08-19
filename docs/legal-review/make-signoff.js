const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
  LevelFormat, PageBreak,
} = require("docx");
const fs = require("fs");

const W = 9026;                    // A4 content width in DXA
const TEAL = "14413F";
const COPPER = "7A5618";
const GREY = "5D6A67";
const FLAG = "8A3324";
const RULE = { style: BorderStyle.SINGLE, size: 6, color: "DED4C5" };
const NONE = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };

const p = (text, o = {}) => new Paragraph({
  spacing: { after: o.after ?? 140, before: o.before ?? 0, line: 276 },
  alignment: o.align,
  children: [new TextRun({
    text, bold: o.bold, italics: o.italics,
    size: o.size ?? 21, color: o.color, font: o.font,
  })],
});

const bullets = (items, o = {}) => items.map((t) => new Paragraph({
  numbering: { reference: "dot", level: 0 },
  spacing: { after: 80, line: 276 },
  children: [new TextRun({ text: t, size: o.size ?? 21 })],
}));

const label = (text) => new Paragraph({
  spacing: { before: 240, after: 90 },
  children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 16, color: COPPER })],
});

const cell = (children, o = {}) => new TableCell({
  width: { size: o.w, type: WidthType.DXA },
  margins: { top: 110, bottom: 110, left: 150, right: 150 },
  shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill, color: "auto" } : undefined,
  columnSpan: o.span,
  children,
});

const confirmBox = () => new Table({
  columnWidths: [Math.floor(W / 2), Math.ceil(W / 2)],
  width: { size: W, type: WidthType.DXA },
  borders: { top: RULE, bottom: RULE, left: RULE, right: RULE, insideHorizontal: RULE, insideVertical: RULE },
  rows: [
    new TableRow({
      children: [
        cell([p("☐   Confirmed as recommended", { bold: true, after: 0, size: 20 })],
          { w: Math.floor(W / 2), fill: "F1EFE8" }),
        cell([p("☐   Not confirmed — see below", { bold: true, after: 0, size: 20 })],
          { w: Math.ceil(W / 2), fill: "F1EFE8" }),
      ],
    }),
    new TableRow({
      children: [cell([
        p("Correction or comment:", { color: GREY, size: 18, after: 100 }),
        p(" ", { after: 100 }), p(" ", { after: 0 }),
      ], { w: W, span: 2 })],
    }),
  ],
});

const recommend = (lines) => new Table({
  columnWidths: [W],
  width: { size: W, type: WidthType.DXA },
  borders: {
    top: NONE, bottom: NONE, right: NONE, insideHorizontal: NONE, insideVertical: NONE,
    left: { style: BorderStyle.SINGLE, size: 18, color: COPPER },
  },
  rows: [new TableRow({
    children: [cell([
      p("RECOMMENDED ANSWER", { bold: true, size: 16, color: COPPER, after: 110 }),
      ...lines,
    ], { w: W, fill: "FAF7F0" })],
  })],
});

const basis = (t) => p(t, { size: 18, color: GREY, italics: true, after: 200 });

const q = (n, text) => new Paragraph({
  spacing: { before: 320, after: 110 },
  children: [
    new TextRun({ text: `Q${n}.  `, bold: true, size: 21, color: TEAL }),
    new TextRun({ text, bold: true, size: 21 }),
  ],
});

const h1 = (t) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 300, after: 180 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: TEAL, space: 8 } },
  children: [new TextRun({ text: t, bold: true, size: 30, color: TEAL })],
});
const h2 = (t) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 340, after: 120 },
  children: [new TextRun({ text: t, bold: true, size: 24, color: "16211F" })],
});
const brk = () => new Paragraph({ children: [new PageBreak()] });

const current = (t) => new Table({
  columnWidths: [W],
  width: { size: W, type: WidthType.DXA },
  borders: { top: RULE, bottom: RULE, left: RULE, right: RULE, insideHorizontal: NONE, insideVertical: NONE },
  rows: [new TableRow({
    children: [cell([
      p("CURRENTLY IN THE FILE", { bold: true, size: 15, color: GREY, after: 90 }),
      p(t, { font: "Consolas", size: 18, after: 0 }),
    ], { w: W, fill: "F5F3EE" })],
  })],
});

const doc = new Document({
  creator: "What Now?",
  title: "Legal sign-off — two open items",
  description: "Recommended answers for confirmation",
  numbering: {
    config: [{
      reference: "dot",
      levels: [{
        level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 420, hanging: 220 } } },
      }],
    }],
  },
  styles: { default: { document: { run: { font: "Calibri", size: 21 } } } },
  sections: [{
    properties: { page: { margin: { top: 1300, bottom: 1300, left: 1440, right: 1440 } } },
    children: [
      // ================= COVER =================
      p("WHAT NOW?   ·   PRE-LAUNCH REVIEW", { bold: true, size: 16, color: COPPER, after: 200 }),
      new Paragraph({
        spacing: { after: 220 },
        children: [new TextRun({ text: "Two items need a lawyer’s sign-off", bold: true, size: 40, color: TEAL })],
      }),
      p("Everything else in the app’s legal content is now grounded in the four authoritative documents and verified. These two items are the remainder. Neither is a defect — both are places where the app deliberately declined to state something it could not source.", { size: 22, after: 220 }),
      p("Prepared 19 August 2026", { color: GREY, size: 19, after: 0 }),
      new Paragraph({ spacing: { before: 220, after: 280 }, border: { bottom: RULE } }),

      label("How to use this document"),
      p("Every item already has a recommended answer drafted. In most cases you only need to read it and tick a box.", { after: 130 }),
      ...bullets([
        "Where you agree, tick “Confirmed as recommended”.",
        "Where you disagree, tick “Not confirmed” and write the correction underneath.",
        "“Depends — confirm with X” is a valid and preferred answer. The app is built to say that honestly; it is not built to guess.",
        "“No, do not state that” is also a complete answer. Every item can safely stay as it is.",
      ]),

      label("Why only these two remain"),
      p("The app’s legal content was audited against the four documents in the KNOWLEDGE folder. Ninety-seven findings were raised and independently checked; fifty-five were confirmed and have been implemented. That work corrected wrong case attributions, added a Victorian Charter ground, and closed a gap where judicial review appeared nowhere on the Victorian side.", { after: 130 }),
      p("What is left is material the four documents do not cover. Rather than fill those gaps from general knowledge, the app leaves them blank and says so.", { after: 0 }),

      brk(),

      // ================= PART 1 =================
      h1("Part 1 — Merits-review criteria for three schemes"),

      label("Context"),
      p("The field is called mrCriteria. It holds the criteria the tribunal applies when it remakes a decision — the test from the enabling Act. It is not the grounds of judicial review, and it is not what the original decision-maker did wrong. Following Frugtniet, the tribunal applies the same statutory criteria that bound the original decision-maker, and this is where those criteria live.", { after: 130 }),
      p("Three of the six decision types still carry a placeholder instead of a real test.", { after: 130 }),

      p("Current exposure is nil.", { bold: true, after: 60 }),
      p("The field has no consumers — it renders nowhere in the app today, so no member of the public has ever seen the placeholder. This is documentation debt, not a live risk. It becomes user-facing the moment we surface “what carries weight at the tribunal” for each scheme, which is the natural next step.", { after: 130 }),

      p("The recommendations below are alignments, not new assertions.", { bold: true, after: 60 }),
      p("Each is drawn from the equivalent field in the app’s decode corpus, which your team already reviewed and marked verified. In other words, the app is already telling people these things elsewhere; the recommendation simply makes the two knowledge sources agree.", { after: 0 }),

      h2("1.1   Centrelink and social security"),
      p("File: data/pathways/cth-centrelink.md", { font: "Consolas", size: 18, color: GREY, after: 130 }),
      current("VERIFY against the Social Security Act 1991 / Administration Act 1999 — real substantive criteria only"),
      recommend([
        ...bullets([
          "The tribunal decides whether the rules were applied correctly to your situation.",
          "It decides whether the facts relied on were right, such as the income and dates used.",
          "Where there is a debt, it decides whether the debt is owed and how much it is.",
          "It decides whether your circumstances were properly taken into account.",
        ], { size: 20 }),
      ]),
      basis("Basis: the groundsOrCriteria field of the verified cth-centrelink decode entry (lawyer-reviewed, last verified 30 June 2026)."),
      confirmBox(),

      h2("1.2   Fines and infringements"),
      p("File: data/pathways/vic-fines.md", { font: "Consolas", size: 18, color: GREY, after: 130 }),
      p("Note: this scheme does not go to a tribunal. The path is internal review, then the Magistrates’ Court. The recommendation reflects that.", { size: 19, after: 130 }),
      current("VERIFY against the Fines Reform Act 2014 / Infringements Act 2006 — real substantive criteria only"),
      recommend([
        ...bullets([
          "The reviewing agency decides whether the fine should stand or be cancelled.",
          "The grounds include a mistake of identity, and a decision that was contrary to law.",
          "They also include exceptional circumstances, and special circumstances such as mental illness, disability, serious addiction, homelessness, or family violence.",
          "If the matter goes to court instead, the court decides the charge itself.",
        ], { size: 20 }),
      ]),
      basis("Basis: the groundsOrCriteria field of the verified vic-fines decode entry (lawyer-reviewed, last verified 16 June 2026)."),
      confirmBox(),

      h2("1.3   Public and social housing"),
      p("File: data/pathways/vic-public-housing.md", { font: "Consolas", size: 18, color: GREY, after: 130 }),
      current("VERIFY against the relevant housing policy / enabling Act — real substantive criteria only"),
      recommend([
        ...bullets([
          "For a housing decision, the reviewer decides whether the department applied its own policies and procedures correctly.",
          "For an eviction, VCAT decides whether the notice to vacate is valid.",
          "For an eviction, VCAT also decides whether it is reasonable and proportionate to make you leave. It weighs the impact on you and your household.",
        ], { size: 20 }),
      ]),
      basis("Basis: the groundsOrCriteria field of the verified vic-public-housing decode entry (last verified 16 June 2026). The third point mirrors the wording already accepted for the renting entry."),
      confirmBox(),

      label("If a specific test cannot be stated"),
      p("Any of the three may instead take the general form already used by the two catch-all entries: “The criteria come from the Act your decision was made under, not from a general rule.” Choosing that is a complete answer, not a failure to answer. Tick “Not confirmed” and write “use the general form”.", { after: 0 }),

      brk(),

      // ================= PART 2 =================
      h1("Part 2 — Freedom of information"),

      label("Context"),
      p("One page in the app has two halves, and they stand on different footing.", { after: 130 }),
      p("The reasons half is grounded.", { bold: true, after: 60 }),
      p("Your Combined Framework calls a statutory reasons request the shared first step of either review path, and gives ADJR s 13 federally and Administrative Law Act 1978 (Vic) s 8 in Victoria.", { after: 130 }),
      p("The freedom-of-information half is not.", { bold: true, after: 60 }),
      p("None of the four documents contains FOI doctrine, procedure or case law. The only mention anywhere is a volume figure in the venture brief. So the page deliberately states no deadline, no fee, no section number, no exemptions and no process detail — none is available from a source the app trusts.", { after: 130 }),
      p("Page: /learn/how-review-fits-together/information-commissioner", { font: "Consolas", size: 18, color: GREY, after: 0 }),

      h2("2.1   The five statements now published"),
      p("These are live. The first question is simply whether each is correct as a general proposition across both jurisdictions.", { after: 130 }),
      ...bullets([
        "A written statement of reasons tells you what the decision-maker actually relied on.",
        "Asking for reasons is a useful first step on either review path.",
        "Freedom of information is a separate right. It asks to see documents rather than to be told why.",
        "If a freedom of information request is refused, that refusal can usually be reviewed.",
        "Time limits apply to both. Check the limit for your decision rather than assuming.",
      ]),
      p("The page also names the review body: the Office of the Australian Information Commissioner federally, and the Office of the Victorian Information Commissioner in Victoria.", { before: 100, after: 0 }),

      q(1, "Are those five statements correct as written, for both Commonwealth and Victoria?"),
      recommend([p("Yes — confirm as written. They are deliberately general and carry no figures.", { size: 20, after: 0 })]),
      confirmBox(),

      q(2, "Is naming those two Commissioners as the review body accurate, and complete enough?"),
      recommend([p("Yes for the first review step. If a further step commonly follows in Victoria, tell us and we will add one sentence rather than leave a reader thinking the Commissioner is the end of the road.", { size: 20, after: 0 })]),
      confirmBox(),

      q(3, "May we name the FOI Acts — Freedom of Information Act 1982 (Cth) and Freedom of Information Act 1982 (Vic)?"),
      recommend([p("Yes. Naming an Act carries little risk and helps a person search for the right thing.", { size: 20, after: 0 })]),
      confirmBox(),

      q(4, "May we state the statutory time limit for an agency’s decision on an FOI request?"),
      recommend([p("No, by default. We will publish a figure only if you supply it with its source. A wrong deadline is the highest-harm error this app can make, so the current wording tells people a limit applies and to check theirs.", { size: 20, after: 80 }),
        p("If you do want it stated, please give the figure, the provision, and whether it differs between the two jurisdictions.", { size: 19, italics: true, after: 0 })]),
      confirmBox(),

      q(5, "May we state the time limit for seeking review of a refusal?"),
      recommend([p("No, by default — same reasoning as Q4. Supply the figure and source if you want it published.", { size: 20, after: 0 })]),
      confirmBox(),

      q(6, "Should we mention application fees or charges?"),
      recommend([p("Yes, but in general terms only — that charges may apply — with no dollar figures. Fees change more often than we re-verify pages.", { size: 20, after: 0 })]),
      confirmBox(),

      q(7, "Is there an internal-review step before the Commissioner, and should we name it?"),
      recommend([p("Yes, if it exists in both jurisdictions. It is usually the cheapest and fastest step, and it is the one people most often miss. Please confirm it exists and what it is called.", { size: 20, after: 0 })]),
      confirmBox(),

      q(8, "Does making an FOI request affect any review deadline?"),
      recommend([p("Say nothing about pausing. Use the neutral protective form the app already uses for the Ombudsman: the two are separate processes, so keep track of any review time limit as well. Asserting that a request does or does not pause a clock, without a source, is the dangerous direction.", { size: 20, after: 0 })]),
      confirmBox(),

      brk(),

      // ================= PART 3 =================
      h1("Part 3 — Victorian reasons requests"),

      label("A contradiction in the four documents, now settled"),
      p("The four documents cite the Victorian statutory right to reasons two different ways. Three statements say section 8; the JR Hypo says section 10. Rather than put this to you, we checked it against the Act itself.", { after: 130 }),

      new Table({
        columnWidths: [W],
        width: { size: W, type: WidthType.DXA },
        borders: { top: RULE, bottom: RULE, left: RULE, right: RULE, insideHorizontal: NONE, insideVertical: NONE },
        rows: [new TableRow({
          children: [cell([
            p("ADMINISTRATIVE LAW ACT 1978 (VIC)", { bold: true, size: 15, color: GREY, after: 110 }),
            p("Section 8 — Reasons for decision to be furnished by tribunal on request by party concerned", { bold: true, size: 20, after: 70 }),
            p("“A tribunal shall, if requested to do so by any person affected by a decision made or to be made by it, furnish him with a statement of its reasons for the decision.”", { italics: true, size: 19, after: 130 }),
            p("Section 10 — Reasons to be part of record", { bold: true, size: 20, after: 70 }),
            p("Statements of reasons form part of the decision and are incorporated in the record.", { italics: true, size: 19, after: 0 }),
          ], { w: W, fill: "F5F3EE" })],
        })],
      }),

      p("Section 8 is the right to reasons. Section 10 is the record provision. The JR Hypo’s reference to section 10 is a slip. The app already publishes section 8, so nothing needs to change — this is recorded for your awareness, and so the note can be corrected in your own materials if you wish.", { before: 200, after: 0 }),

      h2("The question this raised"),
      p("Reading the Act closely surfaced something we would like checked. Section 8 places the duty on a “tribunal”. Section 2 defines that term functionally, not by name:", { after: 130 }),

      new Table({
        columnWidths: [W],
        width: { size: W, type: WidthType.DXA },
        borders: { top: RULE, bottom: RULE, left: RULE, right: RULE, insideHorizontal: NONE, insideVertical: NONE },
        rows: [new TableRow({
          children: [cell([
            p("“tribunal means a person or body of persons who, in arriving at the decision in question, is or are by law required, whether by express direction or not, to act in a judicial manner to the extent of observing one or more of the rules of natural justice”, excluding a court of law, a tribunal presided over by a Supreme Court judge, and Royal Commissions and inquiries.", { italics: true, size: 19, after: 0 }),
          ], { w: W, fill: "F5F3EE" })],
        })],
      }),

      p("The app currently tells a Victorian to “ask the decision-maker in writing for a statement of reasons”, and attributes that to section 8. The definition is broad and will usually capture an administrative decision-maker affecting someone’s rights or licence. But it is not every decision-maker, and the app states the right without qualification.", { before: 200, after: 0 }),

      q(9, "Is “ask the decision-maker” a safe way to describe a duty the Act places on a “tribunal” as defined in section 2?"),
      recommend([
        p("Yes, keep the plain wording, and add one qualifying sentence.", { bold: true, size: 20, after: 90 }),
        p("Using the word “tribunal” in customer copy would actively mislead — a member of the public reads that as VCAT, which is not what section 2 means. “The decision-maker” is the right plain-English term.", { size: 20, after: 90 }),
        p("But because the right does not reach every Victorian decision, we propose adding: “This right does not cover every decision. If they refuse, a free legal service can tell you whether it applies to yours.”", { size: 20, after: 0 }),
      ]),
      confirmBox(),

      brk(),

      // ================= APPENDIX =================
      h1("What any answer has to satisfy"),
      p("These are enforced by the build, not by convention. Content that breaks them fails the verification gate and cannot ship, so answers written with them in mind go live without a second round.", { after: 160 }),
      ...bullets([
        "Information, never advice. No “you should”, and no first-person recommendation.",
        "No outcome prediction. Nothing about what will, or is likely to, happen in anyone’s case.",
        "No ranking. We never say one ground or one path is stronger than another.",
        "Relates, never satisfies. A fact may relate to a legal element. It never satisfies one.",
        "Every figure carries a source and a date. No unsourced deadline, fee or section number reaches a screen.",
        "Plain English at a grade 9 to 11 reading level. Sentence length is the dominant factor — short sentences pass, long ones fail the build.",
      ]),

      label("Returning your answers"),
      p("Send this document back with the boxes ticked, or reply with the item numbers and your answers. We apply the changes, rebuild the knowledge indexes, and rerun the full gate before anything goes live.", { after: 160 }),

      p("Current state: 2 review processes, 20 grounds and 6 concept pages all pass the legal check. The decode corpus has no outstanding markers. The procedural layer has 6, of which 3 are the criteria in Part 1 and 3 are the accompanying notes in the same files. 211 automated tests and 26 browser checks pass.", { size: 19, color: GREY, after: 0 }),
    ],
  }],
});

Packer.toBuffer(doc).then((b) => {
  fs.writeFileSync(process.argv[2], b);
  console.log("written:", process.argv[2]);
});
