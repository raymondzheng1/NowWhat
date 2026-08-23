---
id: improper-purpose
name: Improper purpose
plainName: The power was used for the wrong reason
oneLine: A power was used to get something it was not given for.
whatItMeans: >-
  Parliament gives each power for a reason. The power has to be used for that
  reason. Using it to get something else can be unlawful. This holds even if
  the decision-maker meant well.
plainExample: >-
  A housing officer refuses your transfer request. The real reason is a
  complaint you made about something else.
whatRelates:
  - The reason you were given does not match what the rules are for.
  - The decision followed soon after you made a complaint.
  - You were told the decision would send a message to others.
  - The reason you were given changed when you asked about it.
  - The decision seems aimed at something the rules never mention.
whatItIsNot: >-
  It does not mean the decision-maker is a bad person. A well-meant decision
  can still use a power the wrong way. Courts do not assume this lightly. They
  start from the position that the power was used properly. Timing on its own
  does not show the reason — a decision that came soon after a complaint may
  have had nothing to do with it.
usedIn:
  - judicial-review
test: >-
  A statutory power may only be used for the purpose it was given for. If
  another purpose was a substantial reason, the use may be unlawful. It is for
  the person challenging the decision to show that, and it is not assumed.
elements:
  - id: proper-purpose
    name: The purpose the power was given for
    layPrompt: Do the rules say what this power is meant to do?
  - id: other-purpose
    name: A different purpose at work
    layPrompt: Does the real reason look like something else?
  - id: substantial
    name: That other purpose was substantial
    layPrompt: Did that other reason come up when the decision was explained?
sources:
  - Owner's administrative-law knowledge base (AdminLawCoach corpus, 2026-08-16)
status: verified
leadingCases:
  - name: >-
      R v Toohey; Ex parte Northern Land Council (1981) 151 CLR 170
    pinpoint: ''
    explains: >-
      A power used for a purpose the Act never gave it is not a valid use.
  - name: >-
      Schlieske v Minister for Immigration and Ethnic Affairs (1988) 84 ALR 719
    pinpoint: ''
    explains: A wide power still has to be used for the purposes of the Act.
  - name: >-
      Samrein Pty Ltd v Metropolitan Water Sewerage and Drainage Board (1982)
      41 ALR 467
    pinpoint: ''
    explains: >-
      The improper purpose need not be the only purpose, only a substantial
      one.
---

General information, not advice. The leading cases were refined on 2026-08-16 against our own judicial review materials.

Provenance. This ground is drawn from our own verified judicial review materials. The cases it cites come from the same source. Verified on 2026-08-16. A supervising lawyer sign-off is tracked separately. The case list changed, so that sign-off needs to be renewed.

Onus added 2026-08-19: "The onus of establishing that the decision-maker acted for an improper
purposes lies on the applicant (Toohey)", and our materials list improper purpose among the
stringent grounds because it "will not be inferred".

**Bad faith was removed from the corpus on 2026-08-23, on the owner's ruling**, and the note lives
here because the owner's memo names this ground as one of the two that do its work: "bad faith
carries a very high threshold and is rarely necessary where improper purpose (4.2) and bias (4.7)
are available".

The sequence was: SBBS was the only case bad faith cited, the owner confirmed it is not one of
theirs, and it was removed a day earlier. That left a published `verified` ground with no authority
at all. The choice was to find a replacement case or to stop publishing the ground, and the owner
chose to stop.

That is the right call for this audience as well as for the corpus. Bad faith imputes dishonesty to
a named officer; `lib/letter/compose.ts` already refused to let it near a letter for exactly that
reason, and the memo's own view is that it is rarely necessary when this ground and bias are open.
A self-represented person who believes they were treated dishonestly is better served by the two
grounds that ask what the power was used FOR and whether the decision-maker was impartial — both of
which are argued from what the letter and the file show, rather than from an allegation about
someone's state of mind.

Nothing here changed. This note exists so the removal is discoverable from the ground a reader
would land on instead.

**Presumption of regularity added to `whatItIsNot` 2026-08-23.** `whatRelates` carries a bare timing
line — "The decision followed soon after you made a complaint" — and `plainExample` is a retaliation
example. Between them they invited a reader to read purpose off the calendar, with nothing saying
what timing on its own is worth. Our materials are pointed about that: improper purpose "will not
lightly be inferred, and, by application of a presumption of regularity, will only be inferred if
the evidence cannot be reconciled with the proper exercise of the power".

So `whatItIsNot` now says courts start from the position that the power was used properly, and that
timing on its own does not show the reason. The bullet and the example stay — what was missing was
the limit on them, not the prompts themselves. "Substantial" in `test` was checked and left alone:
it is Samrein's own word, and the case already sits in this entry saying the improper purpose "need
not be the only purpose, only a substantial one".
