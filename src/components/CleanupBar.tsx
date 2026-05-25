import { Info } from "lucide-react";
import { useEditor } from "@/store/editor";
import { useSettings, type AutoApplyKey } from "@/store/settings";

import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

type AutoOpt = {
  key: AutoApplyKey;
  label: string;
  description?: string;
};

const AUTO_APPLY: AutoOpt[] = [
  {
    key: "collapseBlanksToSpacing",
    label: "Blanks → spacing",
    description:
      "Converts blank lines between paragraphs into extra space-after on the preceding paragraph's style, eliminating visual gaps. Mutually exclusive with 'Remove empty paragraphs'.",
  },
  {
    key: "dashes",
    label: "Em dashes",
    description:
      "Converts double hyphens (--) and spaced single hyphens into proper em dashes (—), and spaced en dashes into em dashes where appropriate.",
  },
  {
    key: "normalizeLists",
    label: "Normalize lists",
    description:
      "Detects bullet or number prefixes in paragraph text and converts them into proper list paragraphs with consistent formatting.",
  },
  {
    key: "pageBreakBefore",
    label: "Section → page break",
    description:
      "Converts Word section breaks that precede headings into explicit page-break-before formatting on the heading paragraph itself.",
  },
  {
    key: "removeEmptyParagraphs",
    label: "Remove empty paragraphs",
    description:
      "Deletes blank paragraphs that contain no visible text — common artifacts from Word import. Mutually exclusive with 'Blanks → spacing'.",
  },
  {
    key: "sanitizeStyleNames",
    label: "Sanitize style names",
    description:
      "Renames messy auto-generated style names like 'Normal + Bold + 12pt' into clean, readable labels such as 'Body'.",
  },
  {
    key: "smartQuotes",
    label: "Smart quotes",
    description:
      "Replaces straight quotation marks (' and \") with typographic curly quotes (‘’ and “”) — opening and closing pairs determined by position.",
  },
  {
    key: "softToHard",
    label: "Soft → hard breaks",
    description:
      "Converts soft line breaks (Shift+Enter, manual line breaks) into hard paragraph breaks, creating true separate paragraphs.",
  },
  {
    key: "stripUnusedStyles",
    label: "Strip unused styles",
    description:
      "Removes style definitions from the document that are not applied to any content, reducing file bloat and clutter.",
  },
  {
    key: "tabsToMargin",
    label: "Tabs → indent",
    description:
      "Converts leading tab characters at the start of a paragraph into formal paragraph indentation (left indent or first-line indent).",
  },
  {
    key: "trimRunBleed",
    label: "Trim italic/bold bleed",
    description:
      "Strips trailing punctuation AND whitespace out of italic/bold/underline runs — fixes the classic 'italics won't stop after the styled word' Word import bug. Mutually exclusive with 'Trailing styled spaces → en/em'.",
  },
  {
    key: "trimTrailing",
    label: "Trim trailing whitespace",
    description:
      "Removes trailing spaces and tabs at the end of every paragraph — common artifacts from copying and pasting between applications.",
  },
  {
    key: "trailingStyledSpacesToEnEm",
    label: "Trailing styled spaces → en/em",
    description:
      "Replaces trailing whitespace inside styled (bold/italic/underline) runs with width-equivalent en (U+2002) and em (U+2003) spaces, stripping the styling. Preserves the visual gap while preventing the style from bleeding into following text. Mutually exclusive with 'Trim italic/bold bleed'.",
  },
];

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

export function CleanupBar() {
  const runPreflight = useEditor((s) => s.runPreflight);
  const applyDocCleanup = useEditor((s) => s.applyDocCleanup);
  const autoApply = useSettings((s) => s.autoApply);
  const setAutoApply = useSettings((s) => s.setAutoApply);

  const handleAutoChange = (key: AutoApplyKey, checked: boolean) => {
    setAutoApply(key, checked);
    if (PREFLIGHT_KEYS.has(key)) {
      if (checked) runPreflight(key as Parameters<typeof runPreflight>[0]);
    } else if (PARAGRAPH_RULE_KEYS.has(key)) {
      applyDocCleanup([key as "smartQuotes" | "dashes" | "trimTrailing" | "tabsToMargin" | "softToHard"], checked);
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-4 px-3 pb-3 text-xs">
        <section>
          <div className="space-y-1">
            {AUTO_APPLY.map((opt) => {
              const on = autoApply[opt.key];
              const row = (
                <label className="flex cursor-pointer items-center justify-between gap-2 rounded px-1.5 py-1 hover:bg-accent/40">
                  <span className="flex items-center gap-1 text-[11px] text-foreground">
                    {opt.label}
                    <Info className="h-3 w-3 text-muted-foreground/70" />
                  </span>
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 accent-primary"
                    checked={on}
                    onChange={(e) => handleAutoChange(opt.key, e.target.checked)}
                  />
                </label>
              );
              return (
                <Tooltip key={opt.key}>
                  <TooltipTrigger asChild>{row}</TooltipTrigger>
                  <TooltipContent side="right" className="w-60 space-y-1.5">
                    <p className="text-[11px] font-semibold text-foreground">{opt.label}</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {opt.description}
                    </p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </section>
      </div>
    </TooltipProvider>
  );
}

