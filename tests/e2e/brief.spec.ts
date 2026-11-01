import { test, expect, type Page } from "@playwright/test";

/**
 * The short analysis and the shorter letter, in a real browser.
 *
 * These run keyless like the rest of the e2e suite, so the two model-backed routes are stood in
 * for with `page.route`. What is under test is the PAGE: what it shows while the brief is being
 * written, where the brief and the full notes sit, what happens when the brief is refused, and
 * how the shorter letter is offered and switched back, and the writing screen that covers the
 * step while the analysis and the letter are written.
 */

const STORY =
  "On 14 October 2026 my car was parked in a bay on Batman Street. An infringement notice was issued " +
  "by a parking enforcement officer. The sign was hidden by a tree, so I could not read it.";

const MEMO_URL = "/start?jur=Vic&area=vic-generic&date=2026-10-14&step=result&view=memo";

async function seed(page: Page) {
  await page.addInitScript((story) => {
    window.localStorage.setItem("wn:tour:off", "1");
    window.localStorage.setItem("wn:install:off", "1");
    // Once per test: a reload must restore from what the page itself wrote, not re-seed.
    if (window.sessionStorage.getItem("__seeded")) return;
    window.sessionStorage.setItem("__seeded", "1");
    window.sessionStorage.setItem("wn-consented", JSON.stringify({ matter: "Vic|vic-generic", flags: {} }));
    window.sessionStorage.setItem(
      "wn-flow",
      JSON.stringify({
        matter: "Vic|vic-generic",
        chosenPath: "internal-review",
        goals: [],
        goalOther: "",
        account: { "q-story": story },
        relatedGrounds: [],
        groundNotes: {},
        criteriaNotes: {},
        pickedCriteria: [],
      }),
    );
  }, STORY);
}

const BRIEF = {
  situation: "You got a parking fine on Batman Street. You say the sign was hidden by a tree.",
  path: "An internal review is the agency looking at its own decision again.",
  points: [],
  otherSide: "The agency will usually say the sign was clear enough.",
  toGather: ["the infringement notice", "photos of the sign"],
  sources: [],
};

test("the short analysis leads, after the time limit, and the full notes fold under it", async ({ page }) => {
  await seed(page);
  let memoCalls = 0;
  await page.route("**/api/memo", async (route) => {
    memoCalls++;
    // Slow, like the real thing, so anything that re-asks while it is in flight shows up.
    await new Promise((r) => setTimeout(r, 9000));
    await route.fulfill({ json: { ok: true, status: "answered", brief: BRIEF } });
  });
  await page.goto(MEMO_URL);

  const memo = page.locator("#memo-text");
  // While it is written, the page is covered by the writing screen, which says what is under way.
  const writing = page.getByRole("dialog", { name: /Writing up your results/i });
  await expect(writing).toBeVisible({ timeout: 15_000 });
  await expect(writing.getByTestId("busy-steps")).toContainText("Your in-depth analysis");
  // Back does not walk away from it: the request in flight would be lost and still paid for.
  // (On a fresh load the router stamps the page's history entry a moment late, and the guard
  // goes on top of it once it has; a person does not press Back inside that moment.)
  await page.waitForFunction(() => (window.history.state as Record<string, unknown> | null)?.wnBusyGuard === true);
  await page.goBack();
  await expect(page).toHaveURL(/view=memo/);
  await expect(writing).toBeVisible();
  // Beneath it: the frame (time limit) and the notice, not the long memo open.
  await expect(memo).toContainText(/Writing your analysis/i);
  await expect(memo.getByRole("heading", { name: "Time limit" })).toBeVisible();

  await expect(memo).toContainText(BRIEF.situation, { timeout: 25_000 });
  await expect(memo).not.toContainText(/Writing your analysis/i);
  await expect(writing).toBeHidden({ timeout: 15_000 });
  // And the copy Back landed on is taken away again: this is still the analysis step.
  await expect(page).toHaveURL(/view=memo/);

  // The time limit comes before anything the model wrote.
  const text = await memo.innerText();
  expect(text.indexOf("Time limit")).toBeLessThan(text.indexOf(BRIEF.situation));

  // The full notes are there, folded.
  const notes = memo.locator("details");
  await expect(notes.locator("summary")).toHaveText(/In-depth analysis/i);
  expect(await notes.evaluate((d) => (d as HTMLDetailsElement).open)).toBe(false);

  // One request for one analysis. A second while the first is in flight is paid twice.
  expect(memoCalls).toBe(1);
});

test("a refused brief leaves the full notes open, exactly as before", async ({ page }) => {
  await seed(page);
  await page.route("**/api/memo", (route) => route.fulfill({ json: { ok: true, status: "not-covered" } }));
  await page.goto(MEMO_URL);

  const memo = page.locator("#memo-text");
  await expect(memo).toContainText(/About/i, { timeout: 15_000 });
  await expect(memo.locator("details")).toHaveCount(0);
  await expect(memo).not.toContainText(/Writing your analysis/i);
  await expect(memo).not.toContainText(/Your situation/i);
});

test("the case letter says to check every sentence, and switches back to the plain letter", async ({ page }) => {
  await seed(page);
  await page.route("**/api/memo", (route) => route.fulfill({ json: { ok: true, status: "not-covered" } }));
  let pathId: string | undefined;
  await page.route("**/api/letter-polish", async (route) => {
    const { draft, case: c } = route.request().postDataJSON() as { draft: string; case?: { pathId: string } };
    pathId = c?.pathId;
    // The written statement summarises the facts: stand in for that by replacing the summary.
    const letter = draft.replace(/(Summary of the facts\n)[^\n]*/, "$1I parked on Batman Street. The sign was hidden by a tree.");
    await route.fulfill({ json: { ok: true, status: "answered", letter } });
  });
  await page.goto(MEMO_URL);

  const apply = page.locator("#r-apply");
  await apply.scrollIntoViewIfNeeded({ timeout: 15_000 });
  await expect(apply).toContainText(/We wrote this to set out your case, from the analysis above/i, { timeout: 15_000 });
  await expect(apply).toContainText("I parked on Batman Street. The sign was hidden by a tree.");
  await expect(apply).not.toContainText("parking enforcement officer");

  await apply.getByRole("button", { name: /use the plain letter/i }).click();
  await expect(apply).toContainText("parking enforcement officer");
  await expect(apply).toContainText(/with your account in full/i);

  await apply.getByRole("button", { name: /use the letter that sets out my case/i }).click();
  await expect(apply).not.toContainText("parking enforcement officer");
  // A review letter is written as a case, for the path it argues.
  expect(pathId).toBe("internal-review");
});

test("a refused shorter letter shows the full one with no notice", async ({ page }) => {
  await seed(page);
  await page.route("**/api/memo", (route) => route.fulfill({ json: { ok: true, status: "not-covered" } }));
  await page.route("**/api/letter-polish", (route) =>
    route.fulfill({ json: { ok: true, status: "not-covered" } }),
  );
  await page.goto(MEMO_URL);
  const apply = page.locator("#r-apply");
  await apply.scrollIntoViewIfNeeded({ timeout: 15_000 });
  await expect(apply).toContainText("parking enforcement officer", { timeout: 15_000 });
  await expect(apply).not.toContainText(/We shortened your account/i);
  // A refused case letter is named as such, so the plain one is read as the fallback.
  await expect(apply.getByTestId("letter-case-refused")).toBeVisible();
});

test("typing in 'Anything else?' does not ask for a new analysis on every keystroke", async ({ page }) => {
  // The analysis is keyed by everything it is written from, including what they add on this
  // step. Read on every keystroke, a sentence typed here was a paid request per letter — each
  // one cancelled on the page and still billed on the server.
  await seed(page);
  let memoCalls = 0;
  await page.route("**/api/memo", async (route) => {
    memoCalls++;
    // The re-write is slow, so a writing screen covering the box would be caught.
    if (memoCalls > 1) await new Promise((r) => setTimeout(r, 3000));
    await route.fulfill({ json: { ok: true, status: "answered", brief: BRIEF } });
  });
  await page.goto(MEMO_URL);
  const memo = page.locator("#memo-text");
  await expect(memo).toContainText(BRIEF.situation, { timeout: 15_000 });
  expect(memoCalls).toBe(1);
  await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 15_000 });

  const more = page.locator("#r-memo textarea").first();
  await more.click();
  await more.pressSequentially("The tree has since been cut back.", { delay: 40 });
  // Settle, then at most one more request for the finished sentence.
  await page.waitForTimeout(2500);
  // The re-write is quiet: they are mid-sentence in the box, so nothing covers it.
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(more).toBeFocused();
  await page.waitForTimeout(1500);
  expect(memoCalls).toBeLessThanOrEqual(2);
});

// Reported live, 2026-11-01: "Use that page" moved the matter to the fines page and left
// their account behind. Consent is held per decision, and the fines page had none yet.
test("moving to the page their words describe brings their account with it", async ({ page }) => {
  await seed(page);
  await page.goto("/start?jur=Vic&area=vic-generic&date=2026-10-14&step=result&view=story");
  await page.getByRole("button", { name: "Use that page" }).click();
  await expect(page).toHaveURL(/area=vic-fines/);
  await expect(page.locator("textarea").first()).toHaveValue(STORY);
});

// Most people read the analysis on a phone: each free service opens its site and dials.
test("the free services in the analysis can be tapped to call or visit", async ({ page }) => {
  await seed(page);
  await page.route("**/api/memo", (route) =>
    route.fulfill({ json: { ok: true, status: "answered", brief: BRIEF } }),
  );
  await page.goto(MEMO_URL);
  const call = page.locator('article a[href^="tel:"]').first();
  await expect(call).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('article a[target="_blank"]').first()).toBeVisible();
});

// The owner's ruling, 2026-11-01: on the judicial-review path the app makes a first cut at
// which grounds the account may relate to, says why in the person's own words, and leaves
// every ground open to tick or untick.
test("judicial review: the grounds the account may relate to come first, ticked, with why", async ({ page }) => {
  await page.addInitScript((story) => {
    window.localStorage.setItem("wn:tour:off", "1");
    window.localStorage.setItem("wn:install:off", "1");
    if (window.sessionStorage.getItem("__seeded")) return;
    window.sessionStorage.setItem("__seeded", "1");
    window.sessionStorage.setItem("wn-consented", JSON.stringify({ matter: "Vic|vic-generic", flags: {} }));
    window.sessionStorage.setItem(
      "wn-flow",
      JSON.stringify({
        matter: "Vic|vic-generic",
        chosenPath: "judicial-review",
        goals: [],
        goalOther: "",
        account: { "q-story": story },
        relatedGrounds: [],
        groundNotes: {},
        criteriaNotes: {},
        pickedCriteria: [],
      }),
    );
  }, "The council cancelled my permit. I never got a chance to reply to the complaint before they decided.");
  let calls = 0;
  await page.route("**/api/grounds-match", async (route) => {
    calls++;
    await new Promise((r) => setTimeout(r, 2500));
    return route.fulfill({
      json: {
        ok: true,
        status: "ready",
        suggestions: [
          {
            groundId: "procedural-fairness-hearing",
            quote: "I never got a chance to reply to the complaint before they decided.",
            why: "You say you could not answer the complaint first.",
          },
        ],
      },
    });
  });
  await page.goto("/start?jur=Vic&area=vic-generic&date=2026-10-14&step=result&view=grounds");
  // While the account is read, the reading screen covers the step.
  const reading = page.getByRole("dialog", { name: /Reading your account/i });
  await expect(reading).toBeVisible({ timeout: 15_000 });
  await expect(reading).toBeHidden({ timeout: 15_000 });
  const suggested = page.getByTestId("grounds-suggested");
  await expect(suggested).toContainText("I never got a chance to reply to the complaint", { timeout: 15_000 });
  await expect(suggested).toContainText("You say you could not answer the complaint first.");
  const box = suggested.getByRole("checkbox");
  await expect(box).toBeChecked();
  // Theirs to take out, and to put back.
  await box.uncheck();
  await expect(box).not.toBeChecked();
  await box.check();
  await expect(page.getByText("Other grounds people raise")).toBeVisible();
  // Its note starts from the sentence of their account it rests on.
  await expect(page.locator("#gn-procedural-fairness-hearing")).toHaveValue(
    "I never got a chance to reply to the complaint before they decided.",
  );
  expect(calls).toBe(1);
});

// The owner, 2026-11-01: the in-depth analysis argues each point both ways, and concludes nothing.
test("the in-depth analysis argues each marked point for and against, with no verdict", async ({ page }) => {
  await page.addInitScript((story) => {
    window.localStorage.setItem("wn:tour:off", "1");
    window.localStorage.setItem("wn:install:off", "1");
    if (window.sessionStorage.getItem("__seeded")) return;
    window.sessionStorage.setItem("__seeded", "1");
    window.sessionStorage.setItem("wn-consented", JSON.stringify({ matter: "Vic|vic-generic", flags: {} }));
    window.sessionStorage.setItem(
      "wn-flow",
      JSON.stringify({
        matter: "Vic|vic-generic",
        chosenPath: "judicial-review",
        goals: [],
        goalOther: "",
        account: { "q-story": story },
        relatedGrounds: ["procedural-fairness-hearing"],
        groundNotes: { "procedural-fairness-hearing": "I never got a chance to reply." },
        criteriaNotes: {},
        pickedCriteria: [],
      }),
    );
  }, STORY);
  await page.route("**/api/memo", (route) =>
    route.fulfill({
      json: {
        ok: true,
        status: "answered",
        brief: {
          ...BRIEF,
          depth: [
            {
              ref: "procedural-fairness-hearing",
              for: "You say nobody asked you before the decision was made.",
              against: "The council may say its letter invited a reply.",
            },
          ],
        },
      },
    }),
  );
  await page.goto(MEMO_URL);
  const memo = page.locator("#memo-text");
  await expect(memo).toContainText(BRIEF.situation, { timeout: 15_000 });
  const notes = memo.locator("details");
  await expect(notes.locator("summary")).toHaveText(/In-depth analysis/i);
  await notes.locator("summary").click();
  await expect(notes).toContainText("The case for this point");
  await expect(notes).toContainText("You say nobody asked you before the decision was made.");
  await expect(notes).toContainText("The case against this point");
  await expect(notes).toContainText("The council may say its letter invited a reply.");
  await expect(notes).not.toContainText(/Where that leaves this point/i);
  await expect(notes).not.toContainText(/The answer likely to be given/i);
});

// Reported 2026-11-01: the grounds step and the analysis both opened at their last line. The
// writing screen handed focus back to the "Next" button pressed at the foot of the last step,
// and the browser scrolled the new step down to it.
test("a step that is written while you wait opens at its top, not its foot", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(() => {
    window.localStorage.setItem("wn:tour:off", "1");
    window.localStorage.setItem("wn:install:off", "1");
    if (window.sessionStorage.getItem("__seeded")) return;
    window.sessionStorage.setItem("__seeded", "1");
    window.sessionStorage.setItem("wn-consented", JSON.stringify({ matter: "Vic|vic-generic", flags: {} }));
    window.sessionStorage.setItem(
      "wn-flow",
      JSON.stringify({
        matter: "Vic|vic-generic",
        chosenPath: "judicial-review",
        goals: ["reasons"],
        goalOther: "",
        account: { "q-story": "The council cancelled my permit. I never got a chance to reply to the complaint before they decided." },
        relatedGrounds: [],
        groundNotes: {},
        criteriaNotes: {},
        pickedCriteria: [],
      }),
    );
  });
  const slow = (json: object) => async (route: import("@playwright/test").Route) => {
    await new Promise((r) => setTimeout(r, 2000));
    await route.fulfill({ json });
  };
  await page.route("**/api/grounds-match", slow({ ok: true, status: "none", suggestions: [] }));
  await page.route("**/api/memo", slow({ ok: true, status: "not-covered" }));
  await page.route("**/api/letter-polish", slow({ ok: true, status: "not-covered" }));
  await page.goto("/start?jur=Vic&area=vic-generic&date=2026-10-14&step=result&view=options");

  for (const name of [/Next: the points you raise/, /Build my analysis/]) {
    await page.getByRole("button", { name }).click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 15_000 });
    await page.waitForTimeout(1200);
    expect(await page.evaluate(() => window.scrollY)).toBeLessThan(400);
  }
});

// The owner, 2026-11-02: quicker. The statement comes back with the analysis, built from the same
// work, and the page shows it without asking for the letter a second time.
test("a statement that comes back with the analysis is shown, and the letter is not asked for again", async ({ page }) => {
  await seed(page);
  let polishCalls = 0;
  await page.route("**/api/letter-polish", (route) => {
    polishCalls++;
    return route.fulfill({ json: { ok: true, status: "not-covered" } });
  });
  await page.route("**/api/memo", async (route) => {
    const { statementDraft } = route.request().postDataJSON() as { statementDraft: string };
    // The page sends its plain statement; stand in for the assembled one by marking it.
    const statement = statementDraft.replace(/(Summary of the facts\n)[^\n]*/, "$1ASSEMBLED FROM THE ANALYSIS.");
    await route.fulfill({ json: { ok: true, status: "answered", brief: BRIEF, statement } });
  });
  await page.goto(MEMO_URL);
  const apply = page.locator("#r-apply");
  await apply.scrollIntoViewIfNeeded({ timeout: 15_000 });
  await expect(apply).toContainText("ASSEMBLED FROM THE ANALYSIS.", { timeout: 15_000 });
  await page.waitForTimeout(1500);
  expect(polishCalls).toBe(0);
});
