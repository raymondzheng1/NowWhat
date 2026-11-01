import { SELF_WARNING_BLOCKS, SELF_WARNING_HEADING } from "@/lib/draft/warnings";

/**
 * A draft's fixed parts — the lines above its first paragraph, any NOTE TO YOURSELF block, and
 * the sign-off — split from the body the case document is written into.
 *
 * WHY. The case document was asked to copy these word for word and write the body between. Live
 * on the judicial-review statement (2026-11-01) it was refused twice, for a dropped blank, a
 * missing party line and its length, and took nearly three minutes doing it: retyping 150 words
 * of bones is where a rewrite slips, and every word of it is output paid for and waited on. So
 * the model writes the body only, and the bones are put back from the draft, exactly. Every gate
 * still runs over the whole document as assembled.
 */
export interface Bones {
  head: string;
  body: string;
  tail: string;
}

const SIGN_OFFS = ["Yours faithfully,", "Signed:"];

export function splitBones(draft: string): Bones | null {
  const lines = draft.split("\n");
  // The head ends with the decision's (or notice's) date line, and takes in a note that follows.
  let end = lines.findIndex((l) => /^Date of the (decision|notice):/.test(l));
  if (end < 0) return null;
  let i = end + 1;
  while (i < lines.length && !lines[i]!.trim()) i++;
  if (lines[i]?.trim() === SELF_WARNING_HEADING) {
    const rest = lines.slice(i + 1).join("\n");
    const block = SELF_WARNING_BLOCKS.find((w) => w.text !== SELF_WARNING_HEADING && rest.trimStart().startsWith(w.text));
    if (!block) return null;
    end = i + 1;
  }
  const tailAt = lines.findIndex((l, k) => k > end && SIGN_OFFS.some((s) => l.startsWith(s)));
  if (tailAt < 0) return null;
  return {
    head: lines.slice(0, end + 1).join("\n").trimEnd(),
    body: lines.slice(end + 1, tailAt).join("\n").trim(),
    tail: lines.slice(tailAt).join("\n").trim(),
  };
}

/**
 * The body as the model returned it, with any of the bones it copied anyway taken back out —
 * so the document is never assembled with a second header or a second sign-off.
 */
export function bodyOnly(out: string, bones: Bones): string {
  let body = out.replace(/\r\n/g, "\n");
  // A copied head: everything up to the last line the head ends with.
  const headLast = bones.head.split("\n").filter((l) => l.trim()).pop() ?? "";
  const at = headLast ? body.indexOf(headLast) : -1;
  if (at >= 0) body = body.slice(at + headLast.length);
  // A copied sign-off: everything from its first line on.
  const tailFirst = bones.tail.split("\n")[0]!;
  const cut = body.indexOf(tailFirst);
  if (cut >= 0) body = body.slice(0, cut);
  return body.trim();
}

export function assemble(bones: Bones, body: string): string {
  return `${bones.head}\n\n${body.trim()}\n\n${bones.tail}`;
}
