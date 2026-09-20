import { useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Sparkles,
  Link2Off,
  Quote,
  Minus,
  Eraser,
  CornerDownLeft,
  IndentIncrease,
  Delete,
  ArrowDownUp,
  SeparatorHorizontal,
  List,
  Wand2,
  Trash2,
  Scissors,
  Space,
  FileWarning,
} from "lucide-react";
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
  icon: LucideIcon;
};

const TYPOGRAPHY: AutoOpt[] = [
  {
    key: "smartQuotes",
    label: "Smart quotes",
    icon: Quote,
    description:
      "Swaps typewriter quotes for typographic ones based on context. Example: \"hello\" becomes “hello”, and don't becomes don’t. Apostrophes in contractions and possessives are detected by adjacent letters; openers/closers by surrounding whitespace.",
  },
  {
    key: "dashes",
    label: "Em dashes",
    icon: Minus,
    description:
      "Joins double hyphens and spaced hyphens into em dashes used for parenthetical breaks. Example: word--word becomes word—word, and word -- word becomes word—word. Number ranges like 1990-1995 are left alone (use en dashes manually).",
  },
];

const WHITESPACE: AutoOpt[] = [
  {
    key: "trimTrailing",
    label: "Trim trailing whitespace",
    icon: Eraser,
    description:
      "Cuts spaces and tabs hanging off the end of every paragraph, and collapses runs of two or more internal spaces to one. These are invisible in Word but become visible gaps in InDesign — especially at the end of justified lines.",
  },
  {
    key: "softToHard",
    label: "Soft → hard breaks",
    icon: CornerDownLeft,
    description:
      "Promotes Shift+Enter line breaks (which keep a single paragraph) into separate paragraphs. After conversion each line becomes its own paragraph and gets its own paragraph style, spacing and indent — required for InDesign to flow them correctly.",
  },
  {
    key: "tabsToMargin",
    label: "Tabs → indent",
    icon: IndentIncrease,
    description:
      "Removes leading tab characters at the start of a paragraph and moves the equivalent amount into the paragraph style's first-line indent. Result: indentation that survives reflow instead of fixed tab stops that break at different column widths.",
  },
  {
    key: "removeEmptyParagraphs",
    label: "Remove empty paragraphs",
    icon: Delete,
    description:
      "Deletes paragraphs that contain nothing but whitespace — the empty lines authors use to separate sections in Word. In InDesign these create unwanted gaps and orphaned baseline shifts. Mutually exclusive with 'Blanks → spacing'.",
  },
  {
    key: "collapseBlanksToSpacing",
    label: "Blanks → spacing",
    icon: ArrowDownUp,
    description:
      "Alternative to deleting empty paragraphs: keeps the visual gap by adding extra space-after onto the preceding paragraph's style. Each empty paragraph adds ~12pt of space-after, then is removed. Mutually exclusive with 'Remove empty paragraphs'.",
  },
];

const STRUCTURE: AutoOpt[] = [
  {
    key: "cleanWordPagination",
    label: "Clean Word pagination formatting",
    icon: FileWarning,
    description:
      "Removes hidden Word paragraph settings that can force text onto new pages, including accidental “Keep with next,” “Keep lines together,” and “Page break before” formatting — whether set on the paragraph or inherited from a Word style. Intentional chapter and section page breaks are preserved, and headings can still stay attached to the paragraph below them.",
  },
  {
    key: "pageBreakBefore",
    label: "Section → page break",
    icon: SeparatorHorizontal,
    description:
      "Finds Word section breaks sitting before a heading and rewrites them as a 'page-break-before' attribute on that heading's paragraph style. InDesign then starts each chapter on a new frame/page automatically, without needing a manual frame break.",
  },
  {
    key: "normalizeLists",
    label: "Normalize lists",
    icon: List,
    description:
      "Scans paragraph text for typed-in bullet/number prefixes like '• ', '- ', '* ', '1. ' or '2) '. The prefix is removed and the paragraph is tagged as a real list item so InDesign applies your bullet or numbered list style instead of literal characters.",
  },
];

const STYLES: AutoOpt[] = [
  {
    key: "sanitizeStyleNames",
    label: "Sanitize style names",
    icon: Wand2,
    description:
      "Renames Word's auto-generated combo styles like 'Normal + Bold + 12pt + Italic' into a single clean name (e.g. 'Body'). Reduces hundreds of near-duplicate styles down to the meaningful few — much easier to map to InDesign paragraph styles on import.",
  },
  {
    key: "stripUnusedStyles",
    label: "Strip unused styles",
    icon: Trash2,
    description:
      "Deletes any paragraph or character style definition that no paragraph actually uses. Shrinks the style list in the export so InDesign's import dialog only shows styles you need to map. The text content is untouched.",
  },
  {
    key: "trimRunBleed",
    label: "Trim italic/bold bleed",
    icon: Scissors,
    description:
      "Fixes the classic Word bug where italic or bold extends past the styled word into the trailing space and punctuation (e.g. 'word*. *' shows the period in italic). Pulls the punctuation and whitespace out of the styled run. Mutually exclusive with 'Trailing styled spaces → en/em'.",
  },
  {
    key: "trailingStyledSpacesToEnEm",
    label: "Trailing styled spaces → en/em",
    icon: Space,
    description:
      "An alternative to trimming bleed: instead of removing the styled trailing space, replaces it with a fixed-width en (U+2002) or em (U+2003) space and clears the styling. Preserves the original visual width while killing the bleed. Mutually exclusive with 'Trim italic/bold bleed'.",
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
      bleed = 0,
      lists = 0,
      pageBreaks = 0;
    const usedStyles = new Set<string>();
    walkParas(doc.blocks, (p) => {
      usedStyles.add(p.style);
      const text = p.runs.map((r) => r.text).join("");
      if (text.includes("--")) dashes++;
      if (/['"]/.test(text)) smartQuotes++;
      if (p.hasSoftBreaks) softToHard++;
      if (p.leadingTabs > 0) tabsToMargin++;
      if (p.hasMultiSpaces || / $|\t$/.test(text)) trimTrailing++;
      if (!text.trim()) removeEmpty++;
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
    c.collapseBlanksToSpacing = removeEmpty;
    c.trimRunBleed = bleed;
    c.trailingStyledSpacesToEnEm = bleed;
    c.normalizeLists = lists;
    c.pageBreakBefore = pageBreaks;
    c.stripUnusedStyles = doc.paragraphStyles.reduce(
      (n, s) => (usedStyles.has(s.name) ? n : n + 1),
      0,
    );
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
                    <span className="flex min-w-0 flex-1 items-center gap-1.5 text-[11px] text-foreground">
                      <opt.icon className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <span className="truncate">{opt.label}</span>
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
                    <TooltipContent side="right" className="w-60 space-y-1.5 bg-popover text-popover-foreground border border-border shadow-lg">
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
