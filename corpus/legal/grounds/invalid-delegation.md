---
id: invalid-delegation
name: Invalid delegation
plainName: The wrong person made the decision
oneLine: The law named one person to decide, and someone else decided.
whatItMeans: >-
  An Act names who holds a power. Often that person can act through their
  staff. Sometimes the Act means they have to decide it themselves. If someone
  else decides, the decision can be unlawful.
plainExample: >-
  Your payment is cancelled by a team leader. The Act gives that decision to
  the Secretary.
whatRelates:
  - The Act gives this decision to one named person, in terms.
  - The rules name one office, but a different office wrote to you.
  - You were told a senior officer decided, but someone else signed.
  - >-
    The decision is one the Act seems to want that person to make themselves,
    such as a decision that can only be made once.
whatItIsNot: >-
  It does not mean staff can never act for a minister. Many powers are used that
  way every day, and a large department dealing with the same decision often is
  the ordinary case, not a problem. A signature you do not recognise is not a
  sign of anything by itself. The authority to sign does not have to appear in
  the letter, or in any formal document — it can come from the Act, from a
  delegation, or simply from the way the department is set up. The question is
  what the Act requires, not what the letter shows.
usedIn:
  - judicial-review
test: >-
  Whether a subordinate may use the power depends on the Act. The court asks if
  the Act requires the named person to decide personally.
elements:
  - id: named-holder
    name: Who the Act names
    layPrompt: Which office does the letter say the decision belongs to?
  - id: personal-decision
    name: Whether that person had to decide it
    layPrompt: Does the letter say the named person decided it themselves?
  - id: must-be-personal
    name: Whether the Act wanted that person to decide it
    layPrompt: >-
      Does the Act point to this being a decision the named person makes
      themselves?
sources:
  - Owner's administrative-law knowledge base (AdminLawCoach corpus, 2026-08-16)
status: verified
leadingCases:
  - name: Minister for Aboriginal Affairs v Peko-Wallsend Ltd (1986) 162 CLR 24
    pinpoint: Mason J
    explains: >-
      A minister can often act through staff. That is not true of every power.
  - name: 'Pattenden v Commissioner of Taxation [2008] FCA 1590'
    pinpoint: Logan J
    explains: >-
      Whether a subordinate may sign in the named person's place depends on the
      Act.
---

General information, not advice. The signature block is the part of the letter this ground looks at.

Provenance. This ground is drawn from our own verified judicial review materials. The cases it cites come from the same source. Verified on 2026-08-16. A supervising lawyer sign-off is tracked separately.

Pattenden's factors added 2026-08-19. Whether a power must be exercised by its named holder
"depends on the nature of the power and other circumstances – eg, size of department, geographic
area for which department is responsible, frequency of the exercise of power". Those factors
usually point AWAY from a delegation problem in a big agency doing routine work, which is the
honest thing for a reader to know before pursuing this.

Reworked 2026-08-23 on the owner's QA decision. Two `whatRelates` lines invited a reader to treat
the absence of visible authorisation as a signal — "Nothing in the letter shows the signer was
allowed to decide", and "The letter names no person at all, only a team". The law says close to the
opposite. Per Pattenden, the ability of a subordinate to exercise a power in the Minister's name
"need not be found in a formal instrument but may be found in departmental practice", and per
Peko-Wallsend and Carltona a Minister may in general act through a duly authorised officer.

The `authority-to-sign` element went the same way: "Does anything show the signer was allowed to
decide?" asks a reader to look for something the law does not require to be there, and to draw a
conclusion from not finding it.

One line removed was mine, added on 19 August from Pattenden's factors — "The department is large,
and the power is used very often." Those factors are real, but they point AWAY from a delegation
problem, and sitting under "what tends to relate to this" they read as evidence for it. The
substance has moved to `whatItIsNot`, where it belongs.

What the entry now asks instead is the question the law actually asks: does the Act point to this
being a decision the named person must make themselves.
