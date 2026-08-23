---
intro: "Some government decisions can be challenged in one of two ways. They ask different questions, so the right one depends on what you are hoping for. This table is a general guide only — the rules differ from one decision to another."
rows:
  - { aspect: "The question it asks", mr: "Is this the correct or preferable decision?", jr: "Was the decision made lawfully?" }
  - { aspect: "Who decides", mr: "A tribunal (VCAT or the ART)", jr: "A court (Supreme Court or Federal Court)" }
  - { aspect: "What they look at", mr: "The facts and the law, fresh", jr: "Only how the decision was made — its legality" }
  - { aspect: "What they can do", mr: "Change or replace the decision", jr: "Set it aside and send it back — not replace it" }
  - { aspect: "The evidence they look at", mr: "The best and most current evidence. You can give them new information.", jr: "Usually only what was in front of the original decision-maker. A court does not hear the facts again, but it may look at other evidence needed to decide whether the process was lawful." }
  - { aspect: "Who can apply", mr: "Whoever the law for that decision says can apply", jr: "A person with a real interest in the decision" }
  - { aspect: "Cost and formality", mr: "Usually cheaper and less formal", jr: "More formal, and often needs a lawyer" }
  - { aspect: "The money risk", mr: "Usually free, or a low fee", jr: "Court fees. You may also be ordered to pay the other side's costs." }
  - { aspect: "When it is available", mr: "Only where a law gives a review right for that decision", jr: "Generally available. Whether there was a legal error is the question a court decides, not a condition for asking. A law cannot take away the court's power to check that a decision-maker stayed inside their legal limits. Narrower kinds of review can be restricted, and time limits still apply." }
chooser:
  question: "What are you hoping for?"
  options:
    - { prompt: "A different outcome — I think the decision is wrong", leadsTo: "merits-review", because: "Where a law gives a right to merits review, a tribunal can look at the decision again. A tribunal can replace the decision; a court cannot." }
    - { prompt: "The decision was made unfairly or without power", leadsTo: "judicial-review", because: "If the problem is how the decision was made, judicial review asks a court to check that it was lawful." }
    - { prompt: "Both might apply, or I am not sure", leadsTo: "both", because: "Sometimes both are possible, and the time limits are different. A free legal service can help you choose — and quickly, because of the time limits." }
faq:
  - q: "What is the difference between merits review and judicial review?"
    a: "Merits review asks whether the decision is the correct or preferable one — a tribunal looks at it again and can change or replace it. Judicial review asks whether the decision was made lawfully — a court checks how it was made and can set it aside, but cannot make a new decision for you."
  - q: "Which one should I use?"
    a: "It depends on what the problem is. If the problem is the outcome, merits review asks whether the decision is the correct or preferable one. That path is open where a law provides it. If the problem is how the decision was made, judicial review checks its legality. The time limits are different, so a free legal service can help you choose quickly."
  - q: "Can I use both merits review and judicial review?"
    a: "Sometimes both are possible. They have different time limits, so it is worth getting free legal advice early so you do not miss one."
  - q: "If both are open, which one comes first?"
    a: "Where a law gives a right to merits review, that is usually the step people take first. It costs less, it can change the outcome, and a fresh decision may settle the matter without a court. One thing to know before you choose: the court's time limit for the original decision may keep running while the tribunal review happens. Ask a free legal service about that limit before the tribunal starts, rather than after. What is usually left afterwards is a challenge to the tribunal's own decision, which is a different thing. If you think there is also a legality problem, raise it with a human legal service early rather than after the tribunal finishes."
  - q: "What if the tribunal decides against me too?"
    a: "Two different things may be open, and each has its own short time limit. One is an appeal to a court on a question of law, which the law setting up the tribunal gives you. The other is judicial review, which asks whether the tribunal kept within its legal power — for example if it applied the wrong test or did not give you a fair hearing. An appeal sometimes needs the court's permission first. Which one fits is technical, so ask a human legal service quickly."
  - q: "Is there one first step that helps either way?"
    a: "Asking for the reasons in writing helps with both. It is usually free, and it shows you what the decision-maker actually relied on. That is what tells you whether your complaint is about the outcome or about how the decision was made."
  - q: "Can I give them new information?"
    a: "At merits review, usually yes. The tribunal decides on the best and most current evidence, so it can look at things that did not exist when the first decision was made. Judicial review is different — a court usually looks only at what was in front of the original decision-maker."
  - q: "Could I have to pay the government's legal costs?"
    a: "At a tribunal, usually not — merits review is designed to be low-cost and people often act for themselves. Judicial review is a court case, so there are court fees and a court can order you to pay the other side's costs. This is one reason to get free legal help before filing in a court."
  - q: "Is merits review or judicial review cheaper?"
    a: "Merits review at a tribunal is usually cheaper and less formal than going to court for judicial review. Many tribunal reviews are free or low-cost; check the rule for your decision."
---

SEED comparison — general information, not advice.

Two unsourced claims corrected 2026-08-23 on the owner's ruling, both raised by the Fable QA.

**The tribunal clock.** The chooser stated as a rule that going to a tribunal does not pause the
court clock, and that the limit can pass while the review runs. Nothing in the owner's materials
carries that proposition — the closest lines are the framework's keep-judicial-review-in-reserve
sequencing and the notes' bar on inexcusable delay. It now says the limit *may* keep running and
sends the reader to a free service before the tribunal starts. That is the same treatment the owner
ruled for the reasons clock in `judicial-review.md`: the protective message survives, the
unsourceable rule does not.

**The process-evidence exception deleted.** The evidence row added that a court can look at evidence
about what actually happened where the complaint is about the process. The framework says only
"Generally the record before the decision-maker". The sourced half stands alone.

Two more corrections applied 2026-08-23, from an external review the owner approved.

**"Most decisions" was a prevalence claim we cannot source**, and it contradicted our own pages. The
availability row says merits review exists "only where a law gives a review right for that
decision", and `merits-review.md` says the same. The intro now opens on "Some government decisions"
and carries a general-guide caveat, because several cells state a common position rather than a
universal rule.

The caveat sits at the end of `intro` rather than under the table. It belongs under the table, but
that needs a new field on `ComparisonSchema` and a change to `MrVsJr.tsx`, neither of which is this
entry's to make. `intro` renders immediately above the table on both `/learn/compare` and the tour,
so the caveat is read before the rows.

**Directional wording removed from the chooser.** "Merits review ... is usually the path" told a
reader which way to go, which is the behaviour the no-advice gate exists to catch even though no
listed pattern matches that phrasing. Both the chooser option and the "Which one should I use?"
answer now compare the two routes instead of pointing at one. The "which comes first" answer was
left alone: it describes what people do rather than recommending a step, and its parallel-clock
warning and referral were settled earlier today.

**Flagged for the supervising lawyer, not changed here.** The "Who can apply" cell compresses the
five remedy-specific standing tests in `standing.md` into one line, and the "money risk" cell states
costs exposure flatly. Both are over-general in the same way "Most decisions" was, but tightening
them needs sourced content this entry does not hold.
