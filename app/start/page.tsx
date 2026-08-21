import type { Metadata } from "next";
import { RightsSaverClient } from "@/components/feature/RightsSaverClient";
import { getProcess, groundsForProcess, listConcepts } from "@/lib/legal";
import { listDataEntries } from "@/lib/data";
import { getFaqsForEntry } from "@/lib/faq/load";
import { listEntries } from "@/lib/corpus/index";
import { JsonLd } from "@/components/site/JsonLd";
import { howToLd } from "@/lib/seo/jsonld";

export const metadata: Metadata = {
  title: "Work out how to review a government decision",
  description:
    "Answer a few plain questions about a Centrelink, fine, housing or other government decision (Victoria or Commonwealth). See every option — internal review, merits review at the ART or VCAT, judicial review, the Ombudsman, and freedom of information — with the time-limit rule, a draft request for reasons, and where to get help. Plain English. Nothing you enter is stored.",
  alternates: { canonical: "/start" },
};

export default function StartPage() {
  // M-Lean "Rights Saver" — the deterministic triage → deadline-rule → reasons → handoff
  // flow (no model spend). Replaces the old wizard as the primary path. Renders its own
  // focused shell (the marketing chrome + chat launcher are hidden on /start via SiteShell).
  // The Learn concept layer (processes + judicial-review grounds) is passed in from the
  // server so the result can explain the options in-flow and compile selected grounds.
  // Every FAQ article already names the pathway it was written for (frontmatter entryId),
  // so the answer library and this flow describe the same matters. Build the join here (a
  // server component can read the content directory) and hand it down, so the result can
  // offer the real questions people ask about THIS decision.
  const faqsByEntry = Object.fromEntries(
    listDataEntries().map((e) => [
      e.id,
      getFaqsForEntry(e.id).map((f) => ({ slug: f.slug, question: f.question })),
    ]),
  );

  // The application-letter drafts are built by a pure function over the decode corpus
  // entry, so we ship the entries themselves rather than calling an API: the Rights Saver
  // stays entirely client-side and nothing about the person's matter leaves the device.
  const corpusByEntry = Object.fromEntries(listEntries().map((e) => [e.id, e]));

  return (
    <>
      <JsonLd
        data={howToLd({
          name: "How to have an Australian government decision reviewed",
          description:
            "Work out which review options apply to a government decision in Victoria or under Commonwealth law, and what each one can do.",
          path: "/start",
          steps: [
            { name: "Say who made the decision",
              text: "Choose whether an Australian Government body or a state body made the decision. The steps are similar in other states, but the rules come from that state's own laws." },
            { name: "Say what the decision was about",
              text: "Pick the closest kind of decision, add the date on the letter, and tell us anything that makes your situation different." },
            { name: "See your options",
              text: "Read what each route can do — internal review by the department, merits review at a tribunal, judicial review in a court, a free complaint to the Ombudsman, and freedom of information." },
            { name: "Take the next step",
              text: "Use the draft request for reasons, note the time-limit rule for your decision, and take it to a human service." },
          ],
        })}
      />
    <RightsSaverClient
      corpusByEntry={corpusByEntry}
      faqsByEntry={faqsByEntry}
      meritsReview={getProcess("merits-review")!}
      judicialReview={getProcess("judicial-review")!}
      jrGrounds={groundsForProcess("judicial-review")}
      concepts={listConcepts()}
    />
    </>
  );
}
