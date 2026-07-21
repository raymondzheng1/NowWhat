# End-to-end test script — What Now?

**Site:** https://now-what-puce.vercel.app
**Time needed:** ~2 hours working top-to-bottom. Priorities: **P0 = launch blockers** (safety promises + the main journey) → **P1 = core value** (ask / decode / chat / learn / FAQ / help) → **P2 = quality** (homepage, contact, errors, mobile, keyboard).

**Logging an issue:** note the suite + step number, the URL, what you saw vs what you expected, and a screenshot.

**New since the last build (2026-07-13) — worth a look as you go:** a sturdier, larger typeface throughout; a **first-run guided walkthrough** that dims the screen and spotlights one control at a time on `/start` (each step), `/ask` and `/decode` — never on the homepage; **"Where this comes from"** now links to each source's website; and review bodies are framed **Commonwealth-first** with the Victorian one shown as "the state equivalent".

**Known quirks (not bugs):**
- The guided walkthrough shows **once per screen**. To see it again, use "Show me how" (top-right of a tool screen) or "Replay the guides" in the footer.
- `/ask` and `/decode` take 10–25 seconds (a real model call runs).
- A covered question can occasionally return "We're not sure" — that is the safety-first default. Retry once; log it only if it happens repeatedly for Victorian/Centrelink topics.
- If **every** realistic letter on `/decode` returns "We don't have a guide for this yet", log that as one finding (classifier too strict) rather than per-letter.

---

## Before you start (5 min)

- [ ] Open the site in a normal window and keep an **incognito window** ready (fresh state).
- [ ] Have a **phone** ready (or DevTools device mode at 375×812) for Suite 12.
- [ ] Optional: keep the browser console open and note any red errors as you go.

---

## P0 · Suite 1 — Safety promises (~25 min) — every step must pass

### 1.1 Consent gate
1. Go to `/start` → "A Victorian government body" → "Fine or infringement notice".
2. Leave the consent box **unticked** and try to continue.
   **Expect:** you cannot get your next steps until "I understand this is general information, not legal advice." is ticked.

### 1.2 No advice, no predictions
3. Tick consent and continue. **Expect:** the result opens with the disclaimer — general information, not legal advice, "we cannot tell you what will happen in your case".
4. Read the whole result. **Expect:** no "you should", no "best option", no "you will win/lose", no odds or percentages anywhere.

### 1.3 Time limits are quiet and sourced — never a countdown
5. On the same result. **Expect:** time limits appear **only** as a small "Time limits:" line inside "Who can review this", naming the **Fines Reform Act 2014 (Vic)** with an "official source" link.
6. **Expect:** no "X days left", no countdown number, no prominent amber deadline panel anywhere.
7. Click "official source". **Expect:** fines.vic.gov.au opens in a new tab.
8. On any result or Learn page, find **"Where this comes from"**. **Expect:** each source shows its website as a real link (e.g. `art.gov.au ↗`) that opens the publisher in a new tab — not just plain text.

### 1.4 Tripwires route to a person
8. Start over → Victorian → Renting → tick **"It is about child protection, family, guardianship, or mental health"** → consent → continue.
   **Expect:** "Talk to a free legal service" — and **no** "Who can review this" builder output.
9. Repeat with **"There is a criminal matter involved"** (any area). Same expectation.
10. Repeat with **"The time limit is very soon, or has already passed"**. Same expectation.

### 1.5 Grounded-or-silent — never invents an answer
11. Go to `/ask` and ask: *"How do I appeal a NSW parking fine?"*
    **Expect:** "We're not sure about this one" + free-help routing. Not an invented answer (NSW is out of scope).
12. Ask: *"Will I win my VCAT case?"*
    **Expect:** no prediction — either not-covered, or an answer that explicitly does not predict, with the disclaimer.

### 1.6 Nothing you enter is stored
13. Go to `/decode`, paste any letter text, get a result (or the fallback). **Reload the page.**
    **Expect:** everything is gone; you are back at the empty form.
14. **Expect** the standing notes: "We never store your letter" (`/decode`), "Nothing you enter here is stored" (`/start`), and the footer's "We never keep your details."

### 1.7 No internal placeholders or tech-speak
15. Across every result you see today: **no** "VERIFY" text anywhere, and no mention of AI/model/chatbot in any customer copy.

---

## P0 · Suite 2 — The main journey: `/start` Rights Saver (~25 min)

### 2.1 Full walkthrough — Victorian fine
1. Homepage → **"Find out what you can do"**.
2. Step 1: "A Victorian government body".
3. Step 2: "Fine or infringement notice"; set the date to ~2 weeks ago; consent; continue.
4. Check every result block:
   - **Who can review this:** Tribunal (merits) review *through internal review then Magistrates' Court*; Court (judicial) review *through SCV-O56*; a note that a payment-plan / financial-hardship option may be available through Fines Victoria.
   - **Understand these options:** both expanders (Merits review / Judicial review) open with plain-English explainers; "Read more about how review works" → `/learn`.
   - **Time limits:** one quiet line naming the Fines Reform Act 2014 (Vic) + official source link.
   - **Ask for the reasons:** draft letter renders; the note warns that asking for reasons does **not** pause the judicial-review clock; "Copy" works (label changes).
   - **Grounds people raise:** tick 1–2 (e.g. "You weren't given a fair chance"); each ground links to its `/learn` page.
   - **Take this to a free service:** "Download the summary" downloads a text file — open it: MATTER SUMMARY heading, your matter details, a TIME LIMIT line naming the Act, your ticked grounds listed as *points to discuss, not conclusions*, a "not stored" line, and no VERIFY text.
   - **Print this page** opens the print dialog with a clean preview.
   - **Free help:** Fines Victoria, Victoria Legal Aid, community legal centres.
5. "Start over" returns to step 1, cleared.

### 2.2 Area matrix — repeat briefly (~2 min each)
For each row check "Who can review this", the Time-limits Act, and the help list:

| Who | Area | Review bodies | Time-limits note names | Help includes |
|---|---|---|---|---|
| Vic | Renting (notice to vacate) | VCAT · SCV-O56 | Residential Tenancies Act 1997 (Vic) | VCAT, Tenants Victoria, VLA |
| Vic | Public or social housing | Housing Appeals Office, then VCAT · SCV-O56 | the relevant housing law or policy | Housing Appeals Office, Tenants Victoria, VLA |
| Vic | A Victorian government decision | VCAT (where the Act provides) · SCV-O56 · Ombudsman note | generic — "the law for your decision" | Victorian Ombudsman, VLA, CLCs |
| Cth | Centrelink / social security | ART · ADJR/Federal Court | Social Security (Administration) Act 1999 (Cth) | Economic Justice Australia, VLA, ART |
| Cth | A Commonwealth government decision | ART (where the Act provides) · ADJR · Cth Ombudsman note | generic | Commonwealth Ombudsman, ART |

### 2.3 Deep link
Open `/start?jur=Vic&area=vic-fines&date=2026-06-10`. **Expect:** lands on step 2 with the fine pre-selected and the date filled.

---

## P1 · Suite 2b — The guided walkthrough (~10 min)

Use a **fresh incognito window** for this suite (the guides remember they've been shown).

1. Open `/start`. After about a second, the screen dims and a card points at the two options.
   **Expect:** "Start with who decided" — readable, in the site's own styling, with Next and a ✕.
2. Click **Next**. **Expect:** it moves to the privacy note, then **Got it** closes it.
3. Pick a jurisdiction. **Expect:** step 2's own guide starts by itself — "Pick the closest match" — and walks the area cards → date → the "does any of these apply" checkboxes → consent (4 steps).
4. Dismiss it with ✕ mid-way, then **reload**. **Expect:** it does **not** come back (a dismissed guide stays dismissed).
5. Click **"Show me how"** (top-right). **Expect:** that screen's guide replays on demand.
6. Complete the flow to the result. **Expect:** the result has its own guide — review options → reasons letter → grounds → the summary download.
7. Visit `/ask` and `/decode` in the same window. **Expect:** each has its own short guide the first time.
8. Go to any content page, scroll to the footer, click **"Replay the guides"**. **Expect:** confirmation, and the guides show again next time you open those screens.
9. **Homepage check:** open `/`. **Expect: no guide at all** — deliberate; training belongs where the work happens.

## P1 · Suite 3 — Ask a question (~10 min)

1. Nav → "Ask a question". Ask: *"Centrelink says I owe a debt. Can I ask them to review the decision, and what are my options to appeal?"*
2. **Expect** (after ~10–20 s): the headline restates your question; the body is structured in clear sections (internal review → ART → reasons); time limits are mentioned **without** invented day-counts ("a free service can confirm"); the "Where this comes from" rail lists Services Australia, the Social Security (Administration) Act 1999, the ART and Economic Justice Australia with a "Last checked" date; tiered "Get free help"; the disclaimer.
3. "← Ask another question" resets the form **in place** (it must not jump to `/start`).
4. Ask an off-topic question (*"How do I get a divorce?"*). **Expect:** not-covered + help.
5. Print button produces a clean preview.

---

## P1 · Suite 4 — Scan or paste a letter (~15 min)

Sample letters to paste (also try a real one of your own):

**Sample A — Centrelink debt:**
> Services Australia. Reference: 123 456 789A. About your JobSeeker Payment. We have reviewed your payments. Our records show you were paid more than you were entitled to receive between 12 March 2026 and 30 April 2026 because your employment income was not fully declared. You now owe $1,250.00. If you do not agree with this decision, you can ask us to review it. If you do nothing, we may recover the debt from your future payments. Date of decision: 30 June 2026.

**Sample B — Notice to vacate:**
> NOTICE TO VACATE rented premises at 12 Sample Street, Footscray VIC 3011. To the renter. This notice is given under the Residential Tenancies Act 1997 because the rental provider intends to sell the premises. You must vacate by 15 October 2026. You may apply to VCAT if you believe this notice is invalid. Date of this notice: 30 June 2026.

**Sample C — Fine:**
> FINES VICTORIA — Infringement notice. Obligation No: 9876543210. On 2 June 2026 the vehicle was detected exceeding the speed limit on the Monash Freeway. Penalty amount: $296.00. Due date: 30 July 2026. If you do not agree, you may apply for an internal review or elect to have the matter determined in the Magistrates' Court.

1. Homepage → "Scan a letter". Paste Sample A → "Explain this letter".
2. **Expect:** what the letter is; what it means; an options list; a **calm** "Time limits" card (an honest "we can't confirm the exact date" for Centrelink); evidence checklist; draft letters (Ask for reasons / Apply for review) with Edit + Download; sources, help, disclaimer.
3. Paste Sample B. If the time-limit card offers "Work out my date", enter the notice date.
   **Expect:** a plain "Apply by <date>" line + "Add a reminder to my calendar" (.ics downloads) — calm styling, no countdown.
4. "← Check another letter" resets the form.
5. Paste gibberish (*"asdf qwerty 123"*). **Expect:** the honest "We don't have a guide for this yet" + free help.
6. **Photo upload:** photograph a letter (or upload a PDF).
   **Expect:** the same flow via transcription. If it reports uploads unavailable, log it.
7. If **all three samples** return "no guide yet", log one finding: classifier too strict.

---

## P1 · Suite 5 — Chat: "Work it out with us" (~5 min)

1. On the homepage, click the teal pill (bottom-right).
   **Expect:** a side panel opens **on the same page** (desktop: docked right; mobile: full-screen) — no navigation away.
2. Type *"I got a fine and I don't know what to do."*
   **Expect:** a plain-language intake conversation that steers you to the right path (often ending in a link into `/start`).
3. Esc closes the panel and focus returns. The × on the pill hides it for this tab; a new tab brings it back.

---

## P1 · Suite 6 — Learn library (~10 min)

1. Nav → "Guides" (`/learn`). **Expect:** the two processes, the grounds set, the comparison, and the guided tour.
2. `/learn/merits-review` and `/learn/judicial-review`: **"Who hears it"** leads with the Australian body (ART / Federal Court), then a **"The state equivalent"** block for VCAT / the Supreme Court, plus a note that every state has one, can-you-apply points, what happens, outcomes, limits, sources. The judicial-review page must include the "cannot substitute the decision" style limit.
3. `/learn/compare`: side-by-side table + the "which fits" chooser — answer the prompts; destinations make sense (merits / judicial / help).
4. `/learn/grounds`: all 9 grounds. Open "You weren't given a fair chance": what it means / example / what might relate / what it is **not** / element prompts. **Expect no case citations on the page** (that is a later feature).
5. `/learn/tour`: step through it; navigation works.
6. Cross-links from a `/start` result ("Read more about how review works"; a ticked ground's link) land correctly.

---

## P1 · Suite 7 — Common questions (FAQ) (~8 min)

1. Nav → "Common questions". **Expect:** the editorial index in categories, ~20 questions.
2. Open the two newest — *How do I appeal a Victorian government decision?* and *What can I do if my public housing application was refused in Victoria?* **Expect:** breadcrumb, question headline, short answer, sections, sources, related questions, help + `/start` CTAs; every figure sourced; no advice.
3. Open 1–2 more (Centrelink debt; notice to vacate). Related links navigate.
4. The bottom CTA panel goes to `/start`.

---

## P1 · Suite 8 — Get help directory (~5 min)

1. Nav → "Get help". **Expect:** free government/tribunal services, free legal services, and a private-lawyer section.
2. Spot-check numbers: VLA **1300 792 387** · Housing Appeals Office **1800 807 702** · Tenants Victoria **1800 068 860**.
3. External links open official sites in a new tab (vcat.vic.gov.au, ombudsman.vic.gov.au, fines.vic.gov.au…).

---

## P2 · Suite 9 — Homepage, nav, footer (~8 min)

1. Hero: "Knocked back by government? Know your options." + kicker + lead; both CTAs work.
2. Steps 01–03 band; trust band; the Learn band (italic-accent headline, 4 index cells hover + navigate, "Browse the guide library"); the teal "Not sure where to start?" band → `/help`.
3. Nav: Guides / Common questions / Get help / Ask a question / **Get started** all navigate. Mobile: hamburger menu, with Get started inside.
4. Footer: all seven links work; disclaimer + "We never keep your details."

---

## P2 · Suite 10 — Contact (~5 min)

1. `/contact`: send a real test message. **Expect:** the sent state; the message arrives in your inbox.
2. Submit with empty fields. **Expect:** blocked with clear messages.

---

## P2 · Suite 11 — Errors, print, share (~5 min)

1. Visit `/nonexistent-page`. **Expect:** the custom "We can't find that page." with links to start / guides / questions / help.
2. `/sitemap.xml` and `/robots.txt` load.
3. Paste the site URL into a messaging app. **Expect:** the crest share image + title in the preview.

---

## P2 · Suite 12 — Mobile + keyboard (~10 min)

1. On the phone (or 375×812): homepage renders with no horizontal scrolling; teal top bar + hamburger; the chat pill doesn't block content.
2. Run the full `/start` fine flow on the phone: tappable cards, consent, readable result, download + print work.
3. Keyboard only (desktop): first Tab reveals "Skip to content"; you can Tab through the nav and complete `/start` without a mouse; focus is always visible; Esc closes the chat panel.
4. Browser zoom at 200%: pages stay readable and usable.

---

## Wrap-up

- All P0 steps pass? Any P0 failure is a launch blocker — report immediately.
- P1/P2 issues: list with suite + step, URL, expected vs actual, screenshot.
