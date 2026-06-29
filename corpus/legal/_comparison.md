---
intro: "Most decisions can be challenged in one of two ways. They ask different questions, so the right one depends on what you are hoping for."
rows:
  - { aspect: "The question it asks", mr: "Is this the correct or preferable decision?", jr: "Was the decision made lawfully?" }
  - { aspect: "Who decides", mr: "A tribunal (VCAT or the ART)", jr: "A court (Supreme Court or Federal Court)" }
  - { aspect: "What they look at", mr: "The facts and the law, fresh", jr: "Only how the decision was made — its legality" }
  - { aspect: "What they can do", mr: "Change or replace the decision", jr: "Set it aside and send it back — not replace it" }
  - { aspect: "Cost and formality", mr: "Usually cheaper and less formal", jr: "More formal, and often needs a lawyer" }
  - { aspect: "When it is available", mr: "Only where a law gives a review right", jr: "Where there is a legal error (a ground of review)" }
chooser:
  question: "What are you hoping for?"
  options:
    - { prompt: "A different outcome — I think the decision is wrong", leadsTo: "merits-review", because: "If you want the decision changed, merits review (where it is available) is usually the path, because a tribunal can replace the decision." }
    - { prompt: "The decision was made unfairly or without power", leadsTo: "judicial-review", because: "If the problem is how the decision was made, judicial review asks a court to check that it was lawful." }
    - { prompt: "Both might apply, or I am not sure", leadsTo: "both", because: "Sometimes both are possible, and the time limits are different. A free legal service can help you choose — and quickly, because of the time limits." }
---

SEED comparison — general information, not advice.
