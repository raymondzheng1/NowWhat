// FAQ draft generator (FairGo's pipeline, adapted for Tier B / no-auth).
// Flow: queue.json (pending topic) -> grounded generation (Anthropic) -> pre-gates ->
// write content/faq/_drafts/<slug>.md. A HUMAN then reviews the draft, edits, moves it
// to content/faq/<slug>.md, runs `npm run verify` (the authoritative gate), and commits.
// Nothing auto-publishes; legal content always gets human review. Run: `npm run faq:draft`.
//
// Env: ANTHROPIC_API_KEY (required). Optional: ANTHROPIC_MODEL.

import Anthropic from "@anthropic-ai/sdk";
import matter from "gray-matter";
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FAQ_DIR = resolve(ROOT, "content/faq");
const DRAFTS = resolve(FAQ_DIR, "_drafts");
const REJECTED = resolve(DRAFTS, "REJECTED");
const QUEUE = resolve(FAQ_DIR, "queue.json");
const MODEL = process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-6";

function die(msg) {
  console.error(msg);
  process.exit(1);
}
if (!process.env.ANTHROPIC_API_KEY) die("Set ANTHROPIC_API_KEY to draft FAQ content.");

const corpus = JSON.parse(readFileSync(resolve(ROOT, "corpus/index.json"), "utf8"));
const entryById = Object.fromEntries(corpus.entries.map((e) => [e.id, e]));
const noAdvice = JSON.parse(readFileSync(resolve(ROOT, "lib/safety/no-advice-patterns.json"), "utf8"));
const queue = JSON.parse(readFileSync(QUEUE, "utf8"));

const publishedSlugs = readdirSync(FAQ_DIR)
  .filter((f) => f.endsWith(".md"))
  .map((f) => f.replace(/\.md$/, ""));

const topic = queue.topics.find((t) => t.status === "pending" && !publishedSlugs.includes(t.slug));
if (!topic) die("No pending topics in content/faq/queue.json. Add one (status: pending) and re-run.");
const entry = entryById[topic.entryId];
if (!entry) die(`queue topic "${topic.slug}" references unknown corpus entry "${topic.entryId}".`);

// --- Grounding context (corpus facts only — the allow-list). ---
function context(e) {
  const lines = [
    `ENTRY: ${e.title} (jurisdiction: ${e.jurisdiction})`,
    `EXPLAINER: ${e.plainLanguageExplainer}`,
    `REVIEWABLE: ${e.reviewable.value} — ${e.reviewable.basis}`,
    `RIGHT TO REASONS: ${e.rightToReasons.how} (${e.rightToReasons.provision})`,
  ];
  for (const p of e.pathways) lines.push(`PATHWAY: ${p.name} — ${p.body}; deadline: ${p.deadline}; how to start: ${p.howToStart}`);
  lines.push(`GROUNDS: ${e.groundsOrCriteria.join("; ")}`);
  lines.push(`EVIDENCE: ${e.evidenceChecklist.join("; ")}`);
  lines.push(`GET HELP: ${e.getHelp.map((h) => `${h.service} (${h.who})`).join("; ")}`);
  return lines.join("\n");
}

const SYSTEM = `You write a plain-English FAQ answer for ordinary Victorians about a government decision, grounded ONLY in the CORPUS CONTEXT.
HARD RULES (a vulnerable person relies on this being safe):
1. Use ONLY facts in the CORPUS CONTEXT. Never add a law, section, body, deadline, figure, or link not in it.
2. Information, NOT advice. Never "you should", never recommend a choice, never predict an outcome.
3. Never state a time limit (a number of days/weeks/months) unless that exact figure is in the context.
4. Plain language a 12-year-old can follow. Short sentences. No jargon. Never mention AI, a model, or technology.
5. The body is Markdown with 2–4 "## " sections and MUST include at least one Markdown link to /start. Do NOT add a disclaimer or a sources list — the page template adds those.
Output ONLY one JSON object: {"question": string, "answer": string (2–4 plain sentences), "description": string (<=160 chars), "body": string (Markdown)}.`;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
console.log(`Drafting "${topic.slug}" (grounded in ${entry.id}) with ${MODEL}…`);
const res = await client.messages.create({
  model: MODEL,
  max_tokens: 1600,
  system: SYSTEM,
  messages: [
    {
      role: "user",
      content: `CORPUS CONTEXT (the only facts you may use):\n<<<\n${context(entry)}\n>>>\n\nWrite the FAQ for: "${topic.question}"`,
    },
  ],
});
const raw = res.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();

let data;
try {
  data = JSON.parse(raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim());
} catch {
  die("Model did not return valid JSON. Re-run.");
}

// --- Pre-gates (the safety-critical ones; `verify` is the full gate post-move). ---
const prose = `${data.question} ${data.answer} ${data.body}`;
const failures = [];
const advicePatterns = [...(noAdvice.advice ?? []), ...(noAdvice.prediction ?? []), ...(noAdvice.aiMentions ?? [])];
for (const { pattern, why } of advicePatterns) {
  if (new RegExp(pattern, "i").test(prose)) failures.push(`no-advice (${why})`);
}
// No fabricated deadline: every time figure must appear in the entry's own text.
const TIME = /\b(\d{1,4})\s*(?:calendar|business|working)?\s*(day|days|week|weeks|month|months|year|years)\b/gi;
const u = (x) => (x.startsWith("day") ? "day" : x.startsWith("week") ? "week" : x.startsWith("month") ? "month" : "year");
const entryText = [entry.plainLanguageExplainer, entry.reviewable.basis, entry.body, ...entry.groundsOrCriteria, ...entry.evidenceChecklist, ...entry.pathways.flatMap((p) => [p.deadline, p.howCounted ?? ""])].join("  ");
const grounded = new Set([...entryText.matchAll(TIME)].map((m) => `${Number(m[1])} ${u(m[2].toLowerCase())}`));
for (const p of entry.pathways) if (p.deadlineVerified && typeof p.deadlineDays === "number") grounded.add(`${p.deadlineDays} day`);
for (const m of prose.matchAll(TIME)) {
  const tok = `${Number(m[1])} ${u(m[2].toLowerCase())}`;
  if (!grounded.has(tok)) failures.push(`no-fabricated-deadline ("${m[0].trim()}")`);
}
if (!/\n##\s/.test(`\n${data.body}`)) failures.push("structure (no '## ' section)");
if (!String(data.body).includes("/start")) failures.push("cta (no /start link)");

// --- Write the draft (pass) or the rejected draft (fail). ---
const frontmatter = {
  title: data.question,
  description: data.description,
  question: data.question,
  answer: data.answer,
  entryId: entry.id,
  category: topic.category,
  sources: entry.sources, // GROUNDED: sources come from the corpus entry, never the model
  related: topic.related ?? [],
  updated: null, // a human sets this when they confirm the draft
};
const md = matter.stringify(`\n${data.body}\n`, frontmatter);

mkdirSync(REJECTED, { recursive: true });
if (failures.length) {
  const out = resolve(REJECTED, `${topic.slug}.md`);
  writeFileSync(out, `<!-- REJECTED: ${failures.join("; ")} -->\n${md}`);
  topic.status = "rejected";
  console.error(`✗ Rejected (${failures.length}): ${failures.join("; ")}\n  Saved for reference: ${out}`);
} else {
  const out = resolve(DRAFTS, `${topic.slug}.md`);
  writeFileSync(out, md);
  topic.status = "drafted";
  console.log(`✓ Draft ready: ${out}`);
  console.log(`  Next: review it, set "updated", move it to content/faq/${topic.slug}.md, run \`npm run verify\`, then commit.`);
}
writeFileSync(QUEUE, JSON.stringify(queue, null, 2) + "\n");
