import { test, expect, type Page } from "@playwright/test";

/**
 * The short analysis and the shorter letter, in a real browser.
 *
 * These run keyless like the rest of the e2e suite, so the two model-backed routes are stood in
 * for with `page.route`. What is under test is the PAGE: what it shows while the brief is being
 * written, where the brief and the full notes sit, what happens when the brief is refused, and
 * how the shorter letter is offered and switched back. A hidden browser pane cannot exercise
 * the letter at all — it is asked for when it scrolls into view, and a page that is not drawn
 * never scrolls — so this is where that path is proved.
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
  // While it is written: the frame (time limit) and the notice, not the long memo open.
  await expect(memo).toContainText(/Writing your analysis/i, { timeout: 15_000 });
  await expect(memo.getByRole("heading", { name: "Time limit" })).toBeVisible();

  await expect(memo).toContainText(BRIEF.situation, { timeout: 25_000 });
  await expect(memo).not.toContainText(/Writing your analysis/i);

  // The time limit comes before anything the model wrote.
  const text = await memo.innerText();
  expect(text.indexOf("Time limit")).toBeLessThan(text.indexOf(BRIEF.situation));

  // The full notes are there, folded.
  const notes = memo.locator("details");
  await expect(notes.locator("summary")).toHaveText(/Full notes for a lawyer/i);
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
    const letter = draft.replace(/My reasons are as follows\.[^\n]*/, "I parked on Batman Street. The sign was hidden by a tree.");
    await route.fulfill({ json: { ok: true, status: "answered", letter } });
  });
  await page.goto(MEMO_URL);

  const apply = page.locator("#r-apply");
  await apply.scrollIntoViewIfNeeded({ timeout: 15_000 });
  await expect(apply).toContainText(/We wrote this letter to set out your case/i, { timeout: 15_000 });
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
});

test("typing in 'Anything else?' does not ask for a new analysis on every keystroke", async ({ page }) => {
  // The analysis is keyed by everything it is written from, including what they add on this
  // step. Read on every keystroke, a sentence typed here was a paid request per letter — each
  // one cancelled on the page and still billed on the server.
  await seed(page);
  let memoCalls = 0;
  await page.route("**/api/memo", async (route) => {
    memoCalls++;
    await route.fulfill({ json: { ok: true, status: "answered", brief: BRIEF } });
  });
  await page.goto(MEMO_URL);
  const memo = page.locator("#memo-text");
  await expect(memo).toContainText(BRIEF.situation, { timeout: 15_000 });
  expect(memoCalls).toBe(1);

  const more = page.locator("#r-memo textarea").first();
  await more.click();
  await more.pressSequentially("The tree has since been cut back.", { delay: 40 });
  // Settle, then at most one more request for the finished sentence.
  await page.waitForTimeout(4000);
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
  await page.route("**/api/grounds-match", (route) => {
    calls++;
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
  expect(calls).toBe(1);
});
