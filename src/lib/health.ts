import type { Block, ParagraphBlock, ParsedDoc } from "./types";

function paraText(p: ParagraphBlock) {
  return p.runs.map((r) => r.text).join("");
}

/** Count outstanding warning-level issues across the document. */
export function countIssues(doc: ParsedDoc): number {
  let n = 0;
  const inspect = (p: ParagraphBlock) => {
    if (!p.sourceStyle) n++;
    if (p.hasSoftBreaks && !p.rules.softToHard) n++;
    if (p.hasMultiSpaces) n++;
    if (p.leadingTabs > 0 && !p.rules.tabsToMargin) n++;
    const t = paraText(p);
    if (t.includes("--") && !p.rules.dashes) n++;
    if (/['"]/.test(t) && !p.rules.smartQuotes) n++;
    for (const r of p.runs) {
      if (r.charStyle && r.text && /\s$/.test(r.text)) {
        n++;
        break;
      }
    }
  };
  const walk = (blocks: Block[]) => {
    for (const b of blocks) {
      if (b.kind === "paragraph") inspect(b);
      else
        b.rows.forEach((r) =>
          r.forEach((c) => c.paragraphs.forEach(inspect)),
        );
    }
  };
  walk(doc.blocks);
  return n;
}

/** Health score 0–100 derived from current vs initial issue count. */
export function healthScore(current: number, initial: number): number {
  if (initial <= 0) return 100;
  const ratio = Math.max(0, Math.min(1, 1 - current / initial));
  return Math.round(ratio * 100);
}

export function healthGrade(score: number): { label: string; tone: "good" | "ok" | "warn" } {
  if (score >= 90) return { label: "Pristine", tone: "good" };
  if (score >= 70) return { label: "Clean", tone: "good" };
  if (score >= 40) return { label: "Getting there", tone: "ok" };
  return { label: "Needs work", tone: "warn" };
}
