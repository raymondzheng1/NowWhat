---
id: no-evidence
name: No evidence for a key finding
plainName: The finding had nothing behind it
oneLine: A finding that mattered was made with no evidence to support it.
whatItMeans: >-
  A decision can be challenged if a finding on a key fact was made with no
  evidence at all behind it. The finding has to be one the decision turned on.
  It is not enough that the evidence was thin, or that you disagree with how
  much weight it was given.
plainExample: >-
  A debt is raised on the basis you were paid on dates that the records show you
  were not.
whatRelates:
  - A key finding was made with nothing at all to support it.
  - >-
    Evidence you gave that contradicts a central finding appears to have been
    overlooked.
whatItIsNot: >-
  This is not a way to argue the facts again. A court checking whether a
  decision was lawful does not decide the facts a second time. Where the problem
  is that a fact is simply wrong, merits review is usually the process that
  looks at that. A human service can tell you which one fits your letter.
usedIn:
  - judicial-review
test: >-
  A finding of fact that was a critical step in the decision, made where there
  was nothing to support it, may make the decision unlawful. Thin evidence is
  not the same as no evidence.
elements:
  - id: no-support
    name: No evidence for a key finding
    layPrompt: Was there an important finding with no evidence at all behind it?
  - id: critical
    name: The finding mattered
    layPrompt: Was that finding a step the decision rested on?
sources:
  - Owner's administrative-law knowledge base (judicial review memorandum, 2026-08-22)
  - Victoria Legal Aid — legalaid.vic.gov.au
status: verified
leadingCases:
  - name: Australian Broadcasting Tribunal v Bond (1990) 170 CLR 321
    pinpoint: Mason CJ at 355-356
    explains: >-
      Findings have to rest on evidence that actually proves something, not on
      nothing.
---

**Mistake of material fact removed 2026-08-22, on a senior-partner QA finding.** This was the most
serious defect the review found, and it was published as a `verified` ground.

The entry offered two limbs: no evidence, and mistake of a material fact. **The second is not an
established ground of judicial review in Australia**, and *Bond* — the case this entry cites — is
authority for close to the opposite: a finding of fact made within jurisdiction is not reviewable
merely because it is wrong. What is reviewable is a critical finding made where there was no
evidence to support it. The English line of authority on mistake of fact has not been adopted here.

The limb appeared **five times**: in the ground's own name, in `whatItMeans`, in `whatRelates`, in
`test`, and as a standalone element with its own lay prompt. A reader met it from every direction.

That matters more than the average correction because *"they got a fact wrong"* is the single most
common thing a person believes about their letter. The app was telling them that belief is a ground
of judicial review. It usually is not — it is a **merits** point, and merits review is where a
factual error actually gets fixed. So `whatItIsNot` now routes there instead of leaving the reader
to pursue the wrong process with the limited time they have.

The owner's judicial review memorandum states the surviving ground directly: a decision-maker who
makes a finding of fact that is a critical step in the decision, where there is no probative
evidence to support it, commits a reviewable error; the error must concern a material finding, and
it is not enough that the evidence was merely thin or that the applicant disagrees with the weight
given.

Two further changes from the same review:

**Enfield was dropped from this entry.** It is authority for jurisdictional fact — that some facts
must exist before a power arises, and that a court decides those for itself. That proposition
already has its own entry in `objective-jurisdictional-fact`, where it belongs. Leaving it here
implied it supported a no-evidence ground, which it does not.

**"No probative evidence" was not used**, despite being the memorandum's phrasing, because it fails
the grade-11 reading ceiling. The entry's own existing plain rendering of *Bond* — "evidence that
actually proves something, not nothing" — carries the same idea and was already approved.

Renamed 2026-08-23 on the owner's QA decision. The ground was "No evidence"; it is now "No evidence
for a key finding", which carries the materiality limit in the name itself rather than leaving it
to the test. `plainName` shortened to "The finding had nothing behind it" so the card, which renders
"{name}: {plainName}", does not say key finding twice.
