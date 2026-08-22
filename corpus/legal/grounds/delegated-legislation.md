---
id: delegated-legislation
name: Invalid delegated legislation
plainName: The rule they used may not be valid
oneLine: The decision rests on a rule the Act may not allow.
whatItMeans: >-
  Parliament passes Acts. It also lets others make rules under those Acts.
  These rules are called regulations, determinations or by-laws. A rule like
  that has to stay inside the Act. A rule outside the Act can be invalid.
plainExample: >-
  You get a fine under a council by-law. The by-law bans something the Act
  never let it ban.
whatRelates:
  - The rule covers something the Act never gave power over.
  - The rule goes further than the Act allows.
  - The rule clashes with the Act it was made under, or with another Act.
  - The rule was made for a purpose the Act was not about.
  - The rule goes so far that the Act cannot have meant to allow it.
  - The letter relies on a regulation or a by-law, not an Act.
  - The rule you were quoted is not in the law the letter names.
  - You were told the rule and the law say different things.
whatItIsNot: >-
  It does not mean regulations and by-laws are not real law. Most of them are
  valid. Courts set a high bar before setting one aside. Showing a rule is
  invalid is also only the first step. You then have to show what that meant
  for your own decision.
usedIn:
  - judicial-review
test: >-
  A rule made under an Act has to stay within that Act. The court asks whether
  the rule can reasonably be seen as appropriate and adapted to the purpose the
  Act set. That leaves real room for the rule-maker.
elements:
  - id: within-subject
    name: Inside the subject the Act allows
    layPrompt: Is the rule about something the Act actually covers?
  - id: not-inconsistent
    name: Not inconsistent with the Act
    layPrompt: Were you told the rule and the Act say different things?
  - id: made-for-purpose
    name: Made for the Act's purpose
    layPrompt: Does the rule go further than the Act it was made under?
  - id: proportionate
    name: Appropriate and adapted
    layPrompt: Does the rule cover something the Act does not reach?
sources:
  - Owner's administrative-law knowledge base (AdminLawCoach corpus, 2026-08-16)
status: verified
leadingCases:
  - name: >-
      R v Toohey; Ex parte Northern Land Council (1981) 151 CLR 170
    pinpoint: ''
    explains: >-
      A rule made for a purpose outside the Act is not valid, even if it looks
      valid.
  - name: Vanstone v Clark (2005) 147 FCR 299
    pinpoint: Weinberg J
    explains: >-
      Such a rule has to be appropriate and adapted to the Act's purpose.
---

General information, not advice. The rule number printed on the letter is what this ground looks at. It keeps four elements, because a rule can fail in four separate ways.

Provenance. This ground is drawn from our own verified judicial review materials. The cases it cites come from the same source. Verified on 2026-08-16. A supervising lawyer sign-off is tracked separately.

Two corrections 2026-08-19. The test was stated as whether the rule "is appropriate and adapted";
Vanstone's formulation is "whether the delegated legislation is CAPABLE OF BEING REASONABLY
CONSIDERED to be appropriate and adapted to achieve the prescribed purpose". Dropping that clause
turns a deferential standard into a stricter one than the law applies.

And our materials treat invalidity as step one of two — "Step 1: Regulation invalid? Step 2: How
does that affect the decision?" — so `whatItIsNot` now says so. Without it, someone could read a
bad regulation as the end of the argument rather than the start of one.

Vanstone's five routes to invalidity added to `whatRelates` 2026-08-19: dealing with a subject
outside the power; exceeding the prescribed limits; being inconsistent with or repugnant to the
empowering Act or another Act; being made for an impermissible purpose; and an effect so
unreasonable it cannot fall within the legislature's contemplation. The entry previously carried
only the first.

Three Fable QA findings applied 2026-08-23.

**Absence of an explanation is not a signal.** Two `whatRelates` lines and two lay prompts asked
whether anyone could explain what a rule was for. Front-line staff being unable to explain a rule
is ordinary, and proves nothing under a test our materials call satisfied "only in an extreme
case". This is the same pattern excised from invalid-delegation and without-authority.

**The within-subject element was probing the wrong thing.** It asked whether the letter names both
a rule and the Act behind it, which tests whether a rule is involved at all. It now asks whether
the rule is about something the Act actually covers.

**Project Blue Sky was removed from this entry.** Our materials assign this ground Toohey and
Vanstone, and home PBS in the breach-consequences analysis, where the corpus already cites it.
