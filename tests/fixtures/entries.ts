import type { PathwayEntry } from "@/lib/schemas/corpus";

/** A fully VERIFIED entry — used to test that verified deadlines DO compute/render. */
export const verifiedEntry: PathwayEntry = {
  id: "test-verified",
  title: "Test verified decision",
  jurisdiction: "Commonwealth",
  status: "verified",
  decisionTypes: ["test decision"],
  issuers: ["Test Agency"],
  keywords: [],
  reviewable: { value: "yes", basis: "This decision can be reviewed.", verified: true },
  pathways: [
    {
      name: "Internal review",
      body: "Test Agency",
      deadline: "28 days",
      deadlineDays: 28,
      deadlineVerified: true,
      howCounted: "from the decision date",
      howToStart: "ask the agency to review it",
      cost: "free",
      source: "https://example.gov.au/review",
    },
  ],
  rightToReasons: {
    available: "yes",
    how: "ask in writing",
    provision: "s 1 Test Act 2000",
    source: "https://example.gov.au/reasons",
    verified: true,
  },
  groundsOrCriteria: ["the decision used wrong information"],
  evidenceChecklist: ["your records"],
  getHelp: [{ service: "Legal Aid", who: "free legal help", link: "https://legalaid.example.au" }],
  plainLanguageExplainer: "A test decision you can ask to have reviewed.",
  sources: ["https://example.gov.au/review", "https://example.gov.au/reasons"],
  lastVerified: "2026-06-01",
  body: "",
};
