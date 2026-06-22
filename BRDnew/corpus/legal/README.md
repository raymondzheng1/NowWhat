# corpus/legal/ — grounded legal substance (from OUR materials only)
Built by scripts/build-corpus.mjs from our admin-law materials (the JR structure, review notes, combined MR/JR framework, model answers) into corpus/legal/index.json:
- grounds[] : { id, name, plainName, test, elements[] (each with a lay prompt), leadingCases[] (name + pinpoint) }
- triage    : MR-vs-JR decision logic + remedies + jurisdictions (Vic+Cth)
- This is the ONLY source of legal substance + citations. The verifier rejects any authority not here.
Copy/convert the source docx from ../AdminLawCoach/corpus/source/ (01,02,04,06,07) at build time; do NOT duplicate them by hand.
