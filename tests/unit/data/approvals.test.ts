import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "../../..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");

/**
 * WHO SIGNED WHAT STAYS OFF THE PUBLIC RECORD.
 *
 * Two facts make this a privacy rule rather than a preference, and both were verified rather
 * than assumed:
 *
 *   · `data/index.json` is bundled into a client chunk. Fetching the live site's own
 *     `/start` chunks finds the data layer's criteria, `reviewCadenceDays`, `builtAt` and
 *     `verifiedAsAt` inside `page-*.js` — a file any visitor downloads.
 *   · the GitHub repository is public, so anything committed is published, in the history,
 *     for good.
 *
 * The supervising lawyer is a named private individual. So the record lives in
 * `data/approvals.local.json`: gitignored, read only by `scripts/data-check.mjs`, never
 * imported by the app. These tests hold that shut from three directions — the built index,
 * the frontmatter it is built from, and the app's own imports.
 */
describe("the sign-off ledger never reaches the public artefacts", () => {
  it("the built index carries no approver and no signing date", () => {
    const index = read("data/index.json");
    for (const needle of ["lawyerApprover", "lawyerApprovedAt", "approval", "contentOwner"]) {
      expect(index, `data/index.json must not contain "${needle}"`).not.toContain(needle);
    }
  });

  it("no pathway entry carries an approval block in its frontmatter", () => {
    // Frontmatter is copied wholesale into the index (`{ ...raw }`), so this is where a name
    // would enter. `data-check` fails on it too; this is the test that says why.
    for (const f of [
      "cth-centrelink",
      "cth-generic",
      "vic-fines",
      "vic-generic",
      "vic-public-housing",
      "vic-renting",
    ]) {
      const src = read(`data/pathways/${f}.md`);
      const front = src.split(/^---$/m)[1] ?? "";
      expect(front, `${f}: approval must live in the local ledger`).not.toMatch(
        /^\s*(approval:|lawyerApprover:|lawyerApprovedAt:)/m,
      );
    }
  });

  it("the ledger is gitignored, by that exact name", () => {
    expect(read(".gitignore")).toContain("data/approvals.local.json");
  });

  it("the example template holds no real name", () => {
    const example = read("data/approvals.example.json");
    expect(example).toContain("lawyerApprover");
    // A placeholder describes the field; it never names a person.
    expect(JSON.parse(example)["example-entry-id"].lawyerApprover).toMatch(/supervising lawyer/i);
  });

  it("nothing the browser can load reads the ledger", () => {
    // Only a node script may touch it. An import from lib/, app/ or components/ would pull
    // it into a bundle, which is the one thing this arrangement exists to prevent.
    const code = [
      "lib/data/index.ts",
      "lib/schemas/data.ts",
      "components/feature/RightsSaverClient.tsx",
      "app/api/memo/route.ts",
    ];
    // Comments stripped first: these files SAY where the ledger is and why, which is the
    // documentation that keeps the arrangement understood. An import would survive this.
    const stripComments = (src: string) =>
      src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    for (const f of code) {
      if (!existsSync(resolve(ROOT, f))) continue;
      expect(stripComments(read(f)), `${f} must not read the sign-off ledger`).not.toContain(
        "approvals.local",
      );
    }
  });

  it("the shipped entry type offers no approval shape at all", () => {
    // Belt and braces on the tests above, and it caught something: removing the field from
    // DataPathwaySchema was not enough, because `ApprovalSchema` itself still stood in a
    // file a client component imports — so `lawyerApprover` and `lawyerApprovedAt` were in
    // the live bundle as an empty shape, with nothing using them. An empty shape in a public
    // file is an invitation; one commit filling it publishes a private individual's name.
    const schema = read("lib/schemas/data.ts");
    expect(schema).not.toMatch(/^\s*approval:/m);
    expect(schema).not.toContain("ApprovalSchema = z.object");
    for (const field of ["lawyerApprover:", "lawyerApprovedAt:", "contentOwner:"]) {
      expect(schema, `${field} must not be declared in a client-reachable file`).not.toMatch(
        new RegExp(`^\s*${field.replace(":", ":")}\s`, "m"),
      );
    }
  });
});
