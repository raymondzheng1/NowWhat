---
id: unlawful-policy
name: Unlawful policy
plainName: The policy itself does not match the law
oneLine: A policy cannot cut down what the Act allows.
whatItMeans: >-
  Departments write policies to guide their staff. A policy must fit inside the
  Act it sits under. A policy cannot contradict the Act. It also cannot remove
  a choice the Act gives, or lead to that choice being used in a way the Act
  does not allow.
plainExample: >-
  An Act lets Centrelink waive a debt in special cases. A policy tells staff to
  never waive a debt.
whatRelates:
  - You were quoted a policy rule that the Act does not contain.
  - 'The policy turns a ''may'' in the Act into a ''never''.'
  - A guideline seems to add a condition the law never set.
  - Staff say they have no choice, but the Act gives one.
  - The policy and the wording of the law seem to disagree.
whatItIsNot: >-
  Policies are allowed, and they are useful. The question is whether this
  policy fits the Act. A policy can go wrong in two ways. The policy itself may
  not match the Act, and that is this ground. Or a lawful policy may be applied
  without looking at the person, and that is the inflexible policy ground
  instead.
usedIn:
  - judicial-review
test: >-
  A policy must be consistent with the Act it operates under. A policy that
  removes a discretion the Act gives may be unlawful.
elements:
  - id: policy-relied-on
    name: A policy or guideline was used
    layPrompt: Were you told a policy or guideline decided the outcome?
  - id: conflicts-with-act
    name: The policy conflicts with the Act
    layPrompt: Does the policy seem to say something different from the law?
  - id: removes-discretion
    name: The policy removes a choice the Act gives
    layPrompt: 'Does the Act say ''may'', where the policy says ''never''?'
sources:
  - Owner's administrative-law knowledge base (AdminLawCoach corpus, 2026-08-16)
status: verified
leadingCases:
  - name: Re Drake (No 2)
    pinpoint: ''
    explains: >-
      A policy that is appropriate guides decision-making. It does not control
      it. It tells you the standards and values usually applied.
  - name: Green v Daniels (1977) 13 ALR 1
    pinpoint: ''
    explains: >-
      A general rule was applied so rigidly that it stopped the person from
      being considered at all.
---

A policy can go wrong in two different ways. The policy itself may not match the Act. That is this ground. Or a lawful policy may be applied without looking at the person. That is the inflexible policy ground instead.

Provenance. This ground is drawn from our own verified judicial review materials. The cases it cites come from the same source. Verified on 2026-08-16. A supervising lawyer sign-off is tracked separately.

Case corrected 2026-08-19. This entry cited Drake (No 1); every policy proposition in our
materials is attributed to Drake (No 2) — "It must not apply a policy that is unlawful,
inconsistent with the statute, or leads to an improper exercise of discretion. (Drake No 2)" and
"Lawful policy 'leaves the range of discretion intact while guiding the exercise of the power'
(Drake No 2)". Drake (No 1) is the authority for the nature of merits review, a different point.

Attribution corrected 2026-08-23 on a Fable QA finding. Green carried "A policy cannot override
what the Act says" — a proposition our materials attribute to Drake (No 2): "It must not apply a
policy that is unlawful, inconsistent with the statute, or leads to an improper exercise of
discretion." Green now carries the one the materials attribute to it jointly with Drake:
"Appropriate policy guides, but does not control, decision-making (Drake [No 2]/Green v Daniel)."

The line was not bad law — Green's own holding did involve statutory inconsistency — but the
attribution was unsourced, and this entry's own note already conceded that every policy
proposition in our materials belongs to Drake (No 2).

**The distinguishing sentence moved into the frontmatter, 2026-08-23.** The sentence separating this
ground from inflexible policy was written at the top of this body, where the build strips it —
`GroundExplainer` renders frontmatter only. That is the same defect recorded in
`relevant-considerations` on 2026-08-23. Two policy grounds sat side by side in the explorer with the
distinction visible to nobody but us, so a reader with a policy problem had no way to tell which card was
theirs, and could reasonably tick both.

It now sits in `whatItIsNot`, in the words it was already written in. `inflexible-policy` holds the mirror
sentence in the same dead position; that entry is not in this change set, and the pair should be finished
together. A `relatedGrounds` field would be the cleaner fix, but `lib/schemas/legal.ts` has none and adding
one is not a content change.

**`whatItMeans` broadened the same day.** It gave two failures — contradicting the Act, and removing a
choice the Act gives — which read as though removal of a discretion were required. Drake (No 2) in our
materials is wider: a decision-maker "must not apply a policy that is unlawful, inconsistent with the
statute, or leads to an improper exercise of discretion". The third limb is now published in plain words,
as a choice used in a way the Act does not allow.

**Drake short form kept, 2026-08-23, on the pre-launch legal review. No change here either.** The
reviewer asked for the full authorised citation in this entry and in `inflexible-policy`, or the
case dropped until independently verified. We did neither, for the reason `inflexible-policy`
already records against the same request: the full form appears in none of the four KNOWLEDGE
documents and in none of the captured judgments, so writing one in would add an unsourced citation —
the defect that removed Agfa-Gevaert and SBBS from this corpus. The reviewer agrees on the
principle: internal drafting notes are not a bibliographic source.

Dropping the case is worse here than anywhere else in the set. Every policy proposition in our
materials is attributed to Drake (No 2), as the 19 August note above sets out, and Green carries its
line jointly with Drake. Removing Drake would leave the entry attributing to Green alone what the
materials give to both — the exact error corrected on 23 August.

The citation goes to the supervising lawyer with this entry's sign-off, to be supplied from an
authorised report. `inflexible-policy` carries the matching note, and the two entries move together.

**Case propositions aligned with the twin entry, 2026-08-23.** A reviewer noticed the summaries were
blurred across the two policy grounds: Drake carried "a policy must leave the discretion intact"
here while Green carried "appropriate policy guides, but does not control" — which is Drake's own
proposition, and the one attributed to Drake on inflexible-policy.

Our materials give that proposition to both cases jointly ("Drake [No 2]/Green v Daniel"), so
neither attribution was wrong. But the same case said different things on two pages a reader moves
between, and Green is conventionally cited for rigid application rather than for policy guidance.
Each case now carries the same line on both grounds.
