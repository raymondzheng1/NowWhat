---
id: procedural-fairness-bias
name: Procedural fairness — the rule against bias
plainName: The person deciding was not neutral
oneLine: The person deciding must not have a stake, or a closed mind.
whatItMeans: >-
  The person deciding must come to your case with an open mind. They should not
  have money or personal ties to the result. There are two separate versions of
  this. One asks what was actually in their mind. The other asks how the
  situation would look to a fair-minded onlooker. The second one is the more
  usual way it is raised.
plainExample: >-
  The council officer who looked into your case also decided your fine. They had
  already told you in writing what the answer would be.
whatRelates:
  - The same person looked into your case and then decided it.
  - The decision-maker had already said what they thought.
  - The decision-maker had money or family ties to the result.
  - You were told the answer before you finished explaining.
  - The decision-maker had a role at an earlier stage.
whatItIsNot: >-
  It does not mean the decision-maker must have no views. A firm view is not
  the same as a closed mind. Showing what was really in someone's mind is a
  high bar, so the fair-minded-onlooker version is the one usually relied on.
  The law often lets the same office look into a matter and then decide it. So
  an earlier role only matters if it can be linked to this decision.
usedIn:
  - judicial-review
test: >-
  For a reasonable apprehension of bias, a decision-maker is disqualified if a
  fair-minded lay observer might reasonably apprehend that they might not bring
  an impartial mind to the question. The question is one of possibility, real
  and not remote, rather than probability. For actual bias, the state of mind
  must be so committed to a conclusion already formed as to be incapable of
  alteration.
elements:
  - id: interest-or-role
    name: Something that might sway the decision-maker
    layPrompt: Did they have an interest, an earlier role, or a stated view?
  - id: connection
    name: A link between that thing and this decision
    layPrompt: >-
      Can you join the dots between that thing and the decision going the way
      it did?
  - id: closed-mind
    name: A mind already made up
    layPrompt: Did they seem unable to change their mind, whatever you said?
sources:
  - Owner's administrative-law knowledge base (JR Hypo, 2026-08-19)
status: verified
leadingCases:
  - name: >-
      Minister for Immigration and Multicultural Affairs v Jia Legeng (2001)
      205 CLR 507
    pinpoint: 'Gleeson CJ and Gummow J'
    explains: >-
      Actual bias means a mind so fixed it cannot be changed. Having leanings
      one way is not enough.
  - name: Ebner v Official Trustee in Bankruptcy (2000) 205 CLR 337
    pinpoint: 'Gleeson CJ, McHugh, Gummow and Hayne JJ'
    explains: >-
      The other version asks what a fair-minded onlooker might think. It has
      two steps. First, name the thing that might pull the decision off course.
      Then show how it connects to this decision.
---

Rewritten 2026-08-19 against the JR Hypo. Three changes, each with a reason.

**The two doctrines are now separate.** The Hypo treats actual bias and reasonable apprehension of
bias as distinct, with different tests: Jia asks for a state of mind "so committed to a conclusion
already formed as to be incapable of alteration", while Ebner asks whether "a fair minded lay
observer might reasonably apprehend that the judge might not bring an impartial mind". The old
`test` field blended the two into one paragraph, which left a reader unable to tell which one they
were describing.

**Ebner's two steps are now visible**, because the Hypo is explicit that it is a two-step test:
identify what might lead the decision-maker off the merits, then articulate the logical connection
between that matter and the feared deviation. The `connection` element carries the second step.

**Isbester v Knox City Council was removed.** It appears nowhere in any of the four authoritative
documents. This entry's own note previously said Isbester "is flagged for a lawyer to confirm
before this entry is shown", while the entry was marked `verified` and therefore shown. Losing it
costs a Victorian council illustration, but `plainExample` already carries that scenario without
needing to cite anything.

The "high bar" line in `whatItIsNot` is a statement about the legal test, not about anyone's case.
The Hypo lists actual bias among the stringent grounds; saying so steers a reader towards the
version of the rule that does not require proving someone's private state of mind.

**Combined roles qualified 2026-08-23.** Two `whatRelates` bullets and the `plainExample` all rest on the
same fact — one person looked into the matter and then decided it — and `whatItIsNot` answered only the
firm-view point. So the page said, three times over, that combined roles are a signal, and never said that
the law routinely allows them. Someone reading the grid would take the ordinary shape of a small council
or agency as a ground.

The caveat is extraction, not new law: Ebner is already cited here as a two-step test, and the `connection`
element already carries step two. `whatItIsNot` now states the missing half in the same terms — an earlier
role only matters if it can be linked to this decision. The example is left alone; it is now read against
a limit that appears on the same page.

**The example was not left alone after all, 2026-08-23 (pre-launch review).** The earlier call assumed the
caveat would be read with the example. It is not: the example sits at the top of the page and the caveat is
four sections below it. So the bare overlap of roles still landed first, and on its own it is the shape of
almost every small council and agency.

The example now carries the second step itself. The officer had already told the person in writing what the
answer would be — a fact, on the page, that a reader can look for in their own letter. Nothing is added
about what it proves. That is Ebner's connection step, which this entry already cites and already carries as
the `connection` element, so it is extraction rather than new law. `whatItIsNot` is unchanged.
