import type { Block, ParagraphBlock, ParsedDoc } from "./types";

function paraText(p: ParagraphBlock) {
  return p.runs.map((r) => r.text).join("");
}

export interface IssueBreakdown {
  total: number;
  unmapped: number;
  softBreaks: number;
  multiSpaces: number;
  tabs: number;
  dashes: number;
  quotes: number;
  bleed: number;
}

function inspectParagraph(p: ParagraphBlock): Partial<IssueBreakdown> {
  const b: Partial<IssueBreakdown> = {};
  // Unstyled paragraphs auto-default to Body — not counted as an outstanding issue.
  if (p.hasSoftBreaks && !p.rules.softToHard) b.softBreaks = 1;
  if (p.hasMultiSpaces) b.multiSpaces = 1;
  if (p.leadingTabs > 0 && !p.rules.tabsToMargin) b.tabs = 1;
  const t = paraText(p);
  if (t.includes("--") && !p.rules.dashes) b.dashes = 1;
  if (/['"]/.test(t) && !p.rules.smartQuotes) b.quotes = 1;
  for (const r of p.runs) {
    if (r.charStyle && r.text && /\s$/.test(r.text)) {
      b.bleed = 1;
      break;
    }
  }
  return b;
}

/** Count outstanding warning-level issues across the document. */
export function countIssues(doc: ParsedDoc): number {
  return countIssuesDetailed(doc).total;
}

/** Count issues by category for before/after snapshots. */
export function countIssuesDetailed(doc: ParsedDoc): IssueBreakdown {
  const out: IssueBreakdown = {
    total: 0,
    unmapped: 0,
    softBreaks: 0,
    multiSpaces: 0,
    tabs: 0,
    dashes: 0,
    quotes: 0,
    bleed: 0,
  };
  const inspect = (p: ParagraphBlock) => {
    const b = inspectParagraph(p);
    for (const k of Object.keys(b) as Array<keyof IssueBreakdown>) {
      if (k === "total") continue;
      out[k] += (b[k] as number | undefined) ?? 0;
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
  out.total =
    out.unmapped +
    out.softBreaks +
    out.multiSpaces +
    out.tabs +
    out.dashes +
    out.quotes +
    out.bleed;
  return out;
}

/** Difference between two breakdowns (initial - current = resolved). */
export function diffBreakdown(
  initial: IssueBreakdown,
  current: IssueBreakdown,
): IssueBreakdown {
  return {
    total: Math.max(0, initial.total - current.total),
    unmapped: Math.max(0, initial.unmapped - current.unmapped),
    softBreaks: Math.max(0, initial.softBreaks - current.softBreaks),
    multiSpaces: Math.max(0, initial.multiSpaces - current.multiSpaces),
    tabs: Math.max(0, initial.tabs - current.tabs),
    dashes: Math.max(0, initial.dashes - current.dashes),
    quotes: Math.max(0, initial.quotes - current.quotes),
    bleed: Math.max(0, initial.bleed - current.bleed),
  };
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
