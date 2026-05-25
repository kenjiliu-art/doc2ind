import type { ParagraphBlock } from "./types";

export type IssueKey =
  | "soft"
  | "tabs"
  | "spaces"
  | "qq"
  | "dash"
  | "bleed"
  | "unstyled"
  | "empty";

export interface Issue {
  key: IssueKey;
  label: string;
  /** Short button label for the inline fix. */
  fix?: string;
  /** Cleanup rule key + value, or null if no in-rules fix. */
  rule?: { key: "smartQuotes" | "dashes" | "softToHard" | "tabsToMargin" | "trimTrailing"; value: boolean };
}

function paraText(p: ParagraphBlock) {
  return p.runs.map((r) => r.text).join("");
}

export function detectIssues(p: ParagraphBlock): Issue[] {
  const out: Issue[] = [];
  const text = paraText(p);
  if (!text.trim() && p.runs.length === 0) out.push({ key: "empty", label: "empty" });
  if (p.hasSoftBreaks && !p.rules.softToHard)
    out.push({ key: "soft", label: "soft returns", fix: "→ hard", rule: { key: "softToHard", value: true } });
  if (p.leadingTabs > 0 && !p.rules.tabsToMargin)
    out.push({ key: "tabs", label: "leading tabs", fix: "→ indent", rule: { key: "tabsToMargin", value: true } });
  if (p.hasMultiSpaces) out.push({ key: "spaces", label: "multi-space" });
  if (/['"]/.test(text) && !p.rules.smartQuotes)
    out.push({ key: "qq", label: "straight quotes", fix: "smart", rule: { key: "smartQuotes", value: true } });
  if (text.includes("--") && !p.rules.dashes)
    out.push({ key: "dash", label: "double-hyphen", fix: "em-dash", rule: { key: "dashes", value: true } });
  for (const r of p.runs) {
    if (r.charStyle && r.text && /\s$/.test(r.text)) {
      out.push({ key: "bleed", label: "style bleed" });
      break;
    }
  }
  // Unstyled paragraphs auto-default to Body; not surfaced as a per-paragraph issue.
  return out;
}

export const ISSUE_COLOR: Record<IssueKey, string> = {
  soft: "bg-amber-400",
  tabs: "bg-amber-400",
  spaces: "bg-amber-300",
  qq: "bg-rose-400",
  dash: "bg-rose-400",
  bleed: "bg-fuchsia-500",
  unstyled: "bg-sky-400",
  empty: "bg-neutral-300",
};
