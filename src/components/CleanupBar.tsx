import { useMemo } from "react";
import { Info, Sparkles, Link2Off } from "lucide-react";
import { useEditor } from "@/store/editor";
import { useSettings, type AutoApplyKey, AUTO_APPLY_EXCLUSIONS } from "@/store/settings";
import type { Block, ParagraphBlock } from "@/lib/types";

import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

type AutoOpt = {
  key: AutoApplyKey;
  label: string;
  description: string;
};

const TYPOGRAPHY: AutoOpt[] = [
  {
    key: "smartQuotes",
    label: "Smart quotes",
    description:
      "Replaces straight quotation marks (' and \") with typographic curly quotes (‘’ and “”) — opening and closing pairs determined by position.",
  },
  {
    key: "dashes",
    label: "Em dashes",
    description:
      "Converts double hyphens (--) and spaced single hyphens into proper em dashes (—), and spaced en dashes into em dashes where appropriate.",
  },
];

const WHITESPACE: AutoOpt[] = [
  {
    key: "trimTrailing",
    label: "Trim trailing whitespace",
    description:
      "Removes trailing spaces and tabs at the end of every paragraph — common artifacts from copying and pasting between applications.",
  },
  {
    key: "softToHard",
    label: "Soft → hard breaks",
    description:
      "Converts soft line breaks (Shift+Enter, manual line breaks) into hard paragraph breaks, creating true separate paragraphs.",
  },
  {
    key: "tabsToMargin",
    label: "Tabs → indent",
    description:
      "Converts leading tab characters at the start of a paragraph into formal paragraph indentation (left indent or first-line indent).",
  },
  {
    key: "removeEmptyParagraphs",
    label: "Remove empty paragraphs",
    description:
      "Deletes blank paragraphs that contain no visible text — common artifacts from Word import. Mutually exclusive with 'Blanks → spacing'.",
  },
  {
    key: "collapseBlanksToSpacing",
    label: "Blanks → spacing",
    description:
      "Converts blank lines between paragraphs into extra space-after on the preceding paragraph's style, eliminating visual gaps. Mutually exclusive with 'Remove empty paragraphs'.",
  },
];

const STRUCTURE: AutoOpt[] = [
  {
    key: "pageBreakBefore",
    label: "Section → page break",
    description:
      "Converts Word section breaks that precede headings into explicit page-break-before formatting on the heading paragraph itself.",
  },
  {
    key: "normalizeLists",
    label: "Normalize lists",
    description:
      "Detects bullet or number prefixes in paragraph text and converts them into proper list paragraphs with consistent formatting.",
  },
];

const STYLES: AutoOpt[] = [
  {
    key: "sanitizeStyleNames",
    label: "Sanitize style names",
    description:
      "Renames messy auto-generated style names like 'Normal + Bold + 12pt' into clean, readable labels such as 'Body'.",
  },
  {
    key: "stripUnusedStyles",
    label: "Strip unused styles",
    description:
      "Removes style definitions from the document that are not applied to any content, reducing file bloat and clutter.",
  },
  {
    key: "trimRunBleed",
    label: "Trim italic/bold bleed",
    description:
      "Strips trailing punctuation AND whitespace out of italic/bold/underline runs — fixes the classic 'italics won't stop after the styled word' Word import bug. Mutually exclusive with 'Trailing styled spaces → en/em'.",
  },
  {
    key: "trailingStyledSpacesToEnEm",
    label: "Trailing styled spaces → en/em",
    description:
      "Replaces trailing whitespace inside styled runs with width-equivalent en (U+2002) and em (U+2003) spaces, stripping the styling. Mutually exclusive with 'Trim italic/bold bleed'.",
  },
];

const CATEGORIES: Array<{ title: string; items: AutoOpt[] }> = [
  { title: "Typography", items: TYPOGRAPHY },
  { title: "Whitespace", items: WHITESPACE },
  { title: "Structure", items: STRUCTURE },
  { title: "Styles", items: STYLES },
];

const ALL_OPTS: AutoOpt[] = [...TYPOGRAPHY, ...WHITESPACE, ...STRUCTURE, ...STYLES];
const OPT_BY_KEY = new Map(ALL_OPTS.map((o) => [o.key, o]));

const PARAGRAPH_RULE_KEYS = new Set<AutoApplyKey>([
  "dashes",
  "smartQuotes",
  "softToHard",
  "tabsToMargin",
  "trimTrailing",
]);

const PREFLIGHT_KEYS = new Set<AutoApplyKey>([
  "collapseBlanksToSpacing",
  "normalizeLists",
  "removeEmptyParagraphs",
  "sanitizeStyleNames",
  "stripUnusedStyles",
  "trailingStyledSpacesToEnEm",
  "trimRunBleed",
]);

/** A sensible default set for first-time users. */
const RECOMMENDED: AutoApplyKey[] = [
  "smartQuotes",
  "dashes",
  "trimTrailing",
  "softToHard",
  "tabsToMargin",
  "pageBreakBefore",
  "removeEmptyParagraphs",
  "stripUnusedStyles",
];

function walkParas(blocks: Block[], fn: (p: ParagraphBlock) => void) {
  for (const b of blocks) {
    if (b.kind === "paragraph") fn(b);
    else
      b.rows.forEach((r) =>
        r.forEach((c) => c.paragraphs.forEach(fn)),
      );
  }
}

export function CleanupBar() {
  const doc = useEditor((s) => s.doc);
  const runPreflight = useEditor((s) => s.runPreflight);
  const applyDocCleanup = useEditor((s) => s.applyDocCleanup);
  const autoApply = useSettings((s) => s.autoApply);
  const setAutoApply = useSettings((s) => s.setAutoApply);

  /** Live match counts per auto-apply key. Surfaces "what will/did change". */
  const counts = useMemo(() => {
    const c: Partial<Record<AutoApplyKey, number>> = {};
    if (!doc) return c;
    let dashes = 0,
      smartQuotes = 0,
      softToHard = 0,
      tabsToMargin = 0,
      trimTrailing = 0,
      removeEmpty = 0,
      collapseBlanks = 0,
      bleed = 0,
      lists = 0,
      pageBreaks = 0;
    walkParas(doc.blocks, (p) => {
      const text = p.runs.map((r) => r.text).join("");
      if (text.includes("--")) dashes++;
      if (/['"]/.test(text)) smartQuotes++;
      if (p.hasSoftBreaks) softToHard++;
      if (p.leadingTabs > 0) tabsToMargin++;
      if (p.hasMultiSpaces || / $|\t$/.test(text)) trimTrailing++;
      if (!text.trim()) {
        removeEmpty++;
        collapseBlanks++;
      }
      if (p.sectionBreakBefore) pageBreaks++;
      if (/^\s*([\-\*•·]|\d+[.)])\s/.test(text)) lists++;
      for (const r of p.runs) {
        if (r.charStyle && r.text && /[\s.,;:!?]$/.test(r.text)) {
          bleed++;
          break;
        }
      }
    });
    c.dashes = dashes;
    c.smartQuotes = smartQuotes;
    c.softToHard = softToHard;
    c.tabsToMargin = tabsToMargin;
    c.trimTrailing = trimTrailing;
    c.removeEmptyParagraphs = removeEmpty;
    c.collapseBlanksToSpacing = collapseBlanks;
    c.trimRunBleed = bleed;
    c.trailingStyledSpacesToEnEm = bleed;
    c.normalizeLists = lists;
    c.pageBreakBefore = pageBreaks;
    // Style-level counts
    const unused = doc.paragraphStyles.filter((s) => {
      let used = false;
      walkParas(doc.blocks, (p) => {
        if (p.style === s.name) used = true;
      });
      return !used;
    }).length;
    c.stripUnusedStyles = unused;
    c.sanitizeStyleNames = doc.paragraphStyles.filter((s) =>
      /\+|Normal\s*\+|\d+pt/.test(s.name),
    ).length;
    return c;
  }, [doc]);

  const handleAutoChange = (key: AutoApplyKey, checked: boolean) => {
    setAutoApply(key, checked);
    if (PREFLIGHT_KEYS.has(key)) {
      if (checked) runPreflight(key as Parameters<typeof runPreflight>[0]);
    } else if (PARAGRAPH_RULE_KEYS.has(key)) {
      applyDocCleanup(
        [key as "smartQuotes" | "dashes" | "trimTrailing" | "tabsToMargin" | "softToHard"],
        checked,
      );
    }
  };

  const applyRecommended = () => {
    for (const key of RECOMMENDED) {
      if (!autoApply[key]) handleAutoChange(key, true);
    }
  };

  const recommendedActive = RECOMMENDED.every((k) => autoApply[k]);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-3 px-3 pb-3 text-xs">
        <button
          type="button"
          onClick={applyRecommended}
          disabled={recommendedActive}
          className="flex w-full items-center justify-center gap-1.5 rounded-md border border-primary/30 bg-primary/5 px-2 py-1.5 text-[11px] font-semibold text-primary transition hover:bg-primary/10 disabled:cursor-default disabled:opacity-50"
          title="Enable a sensible default set of cleanups"
        >
          <Sparkles className="h-3 w-3" />
          {recommendedActive ? "Recommended preset active" : "Apply recommended preset"}
        </button>

        {CATEGORIES.map((cat) => (
          <section key={cat.title}>
            <div className="mb-1 px-1.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/80">
              {cat.title}
            </div>
            <div className="space-y-0.5">
              {cat.items.map((opt) => {
                const on = autoApply[opt.key];
                const conflict = AUTO_APPLY_EXCLUSIONS[opt.key];
                const conflictLabel = conflict ? OPT_BY_KEY.get(conflict)?.label : null;
                const conflictActive = conflict ? autoApply[conflict] : false;
                const count = counts[opt.key] ?? 0;
                const row = (
                  <label
                    className={`flex cursor-pointer items-center justify-between gap-2 rounded px-1.5 py-1 hover:bg-accent/40 ${
                      conflictActive ? "opacity-50" : ""
                    }`}
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-1 text-[11px] text-foreground">
                      <span className="truncate">{opt.label}</span>
                      <Info className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      {count > 0 && (
                        <span
                          className={`tabular-nums text-[10px] font-medium ${
                            on ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                          }`}
                        >
                          {count}
                        </span>
                      )}
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 accent-primary"
                        checked={on}
                        onChange={(e) => handleAutoChange(opt.key, e.target.checked)}
                      />
                    </span>
                  </label>
                );
                return (
                  <Tooltip key={opt.key}>
                    <TooltipTrigger asChild>
                      <div>
                        {row}
                        {conflictLabel && conflictActive && (
                          <div className="flex items-center gap-1 px-1.5 pb-1 text-[9px] text-amber-600 dark:text-amber-400">
                            <Link2Off className="h-2.5 w-2.5" />
                            Conflicts with “{conflictLabel}”
                          </div>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="w-60 space-y-1.5">
                      <p className="text-[11px] font-semibold text-foreground">{opt.label}</p>
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        {opt.description}
                      </p>
                      {count > 0 && (
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                          {on ? `Applied to ${count} match${count === 1 ? "" : "es"}` : `${count} match${count === 1 ? "" : "es"} in document`}
                        </p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </TooltipProvider>
  );
}
