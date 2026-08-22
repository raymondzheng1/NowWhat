---
id: relevant-considerations
name: Relevant considerations
plainName: They ignored something they had to take into account
oneLine: The law can name things a decision-maker must take into account.
whatItMeans: >-
  Some Acts say what a decision-maker must take into account. Missing one of
  those matters can make a decision unlawful.
plainExample: >-
  You send Centrelink medical reports about your illness. The debt decision
  never mentions them.
whatRelates:
  - You gave them information that the decision never mentions.
  - >-
    Something the rules say must be weighed appears to have been left out.
  - Your reasons letter skips a matter you raised in writing.
  - A report or assessment you sent in is not discussed anywhere.
whatItIsNot: >-
  It does not mean every point you raised had to be accepted. The required
  matters only had to be genuinely considered. How much weight to give something
  is generally for the decision-maker, so thinking they gave your evidence too
  little weight is usually not something a court will look at. A document also
  does not have to be discussed at length to have been considered.
usedIn:
  - judicial-review
test: >-
  An Act may require certain matters to be taken into account. It can say so
  outright, or it can be implied from what the Act is for. Failing to consider a
  required matter can make the decision invalid. How much attention a matter
  needs depends on how relevant and how important it is.
elements:
  - id: required-matter
    name: A matter the law required them to consider
    layPrompt: Do the rules list something they had to take into account?
  - id: not-considered
    name: That matter was not considered
    layPrompt: Does the decision look like it left that matter out?
sources:
  - Owner's administrative-law knowledge base (AdminLawCoach corpus, 2026-08-16)
status: verified
leadingCases:
  - name: >-
      Certain Children v Minister for Families and Children (No 2) (2017) 52 VR
      441
    pinpoint: ''
    explains: >-
      In Victoria, Charter rights can be part of what a decision-maker must
      weigh.
  - name: Minister for Aboriginal Affairs v Peko-Wallsend Ltd (1986) 162 CLR 24
    pinpoint: 'Mason J'
    explains: >-
      The Act decides which matters a decision-maker must take into account.
  - name: Tickner v Chapman (1995) 57 FCR 451
    pinpoint: ''
    explains: >-
      A matter the law lists must be really thought about, not just filed.
  - name: >-
      Bare v Independent Broad-based Anti-corruption Commission (2015) 48 VR
      129
    pinpoint: ''
    explains: In Victoria, a public body must think about your human rights too.
  - name: Thompson v Minogue (2021) 67 VR 301
    pinpoint: ''
    explains: >-
      A Victorian court applied that human rights duty to prison conditions.
---

Victoria has a Charter of Human Rights and Responsibilities. The Charter does not give a court case of its own. It can only be raised inside a case that already exists. Lawyers call that piggy-backing. So a Charter point rides along with an ordinary ground of review.

This explainer was split from the irrelevant considerations ground on 2026-08-16.

Provenance. This ground is drawn from our own verified judicial review materials. The cases it cites come from the same source. Verified on 2026-08-16. A supervising lawyer sign-off is tracked separately. The text changed materially, so that sign-off needs to be renewed.

Sharpened 2026-08-19: per Mason J in Peko-Wallsend the subject matter, scope and purpose of an Act
"may either expressly state, or necessarily imply, that a certain consideration must (or must not)
be taken into account". The entry implied a required matter had to be written down, which would
lead someone to drop a real complaint after failing to find it listed.

Weight principle added 2026-08-23 on the owner's QA decision. Per Mason J in Peko-Wallsend, "It is
generally for the decision-maker to determine what the appropriate weight to afford a consideration
is", and per Tickner the degree of effort a consideration requires "will vary according to the
length, content, and degree of relevance".

This is the answer to the complaint the entry attracts most often — "they had my report and
ignored it". Failing to consider a required matter is reviewable; giving it less weight than you
would have is generally not. A reader who cannot tell those apart will spend their time on the
half that is not reviewable, and the entry gave them no way to tell.

The related point that a document need not be discussed at length to have been considered matters
for the same reason: a short set of reasons is not, by itself, evidence that something was
overlooked.

**Charter material moved out 2026-08-23**, on a Fable QA finding both passes reached. This entry
carried a third element, "Proper consideration of a human right (Victoria)", and a line in
`whatItMeans` saying Victorian public bodies must also think about your human rights. Read with
this ground's own test — "Failing to consider a required matter can make the decision invalid" —
that told a Victorian reader a proper-consideration failure can invalidate the decision.

It cannot. Per *Certain Children*, breach of the s 38(1) duty "does not of itself give rise to
charter invalidity and in relation to a decision, does not constitute jurisdictional error".

The qualifying explanation existed only in this file's markdown body, which the build strips —
`GroundExplainer` renders frontmatter fields, so nothing on the page carried it. The Charter now
lives solely in `charter-proper-consideration`, which states the consequence rule in its own
`whatItIsNot`.
