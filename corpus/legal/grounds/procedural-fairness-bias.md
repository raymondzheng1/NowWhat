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
  The council officer who looked into your case also decided your fine. Nobody
  else took part.
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
