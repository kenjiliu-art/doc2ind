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
  { key: "smartQuotes", label: "Smart quotes" },
  { key: "dashes", label: "Em dashes" },
  { key: "trimTrailing", label: "Trim trailing spaces" },
  { key: "tabsToMargin", label: "Tabs → indent" },
  { key: "softToHard", label: "Soft → hard breaks" },
  { key: "pageBreakBefore", label: "Section → page break" },
  { key: "stripUnusedStyles", label: "Strip unused styles" },
  {
    key: "collapseBlanksToSpacing",
    label: "Blanks → spacing",
    description:
      "Converts blank lines between paragraphs into extra space-after on the preceding paragraph's style, eliminating visual gaps.",
  },
  {
    key: "normalizeLists",
    label: "Normalize lists",
    description:
      "Detects bullet or number prefixes in paragraph text and converts them into proper list paragraphs with consistent formatting.",
  },
  {
    key: "closeOrphanRuns",
    label: "Close orphan runs",
    description:
      "Moves trailing whitespace out of styled character runs so bold or italic formatting does not bleed into surrounding text.",
  },
  {
    key: "trimRunBleed",
    label: "Trim italic/bold bleed",
    description:
      "Strips trailing punctuation AND whitespace out of italic/bold/underline runs — fixes the classic 'italics won't stop after the styled word' Word import bug.",
  },
  {
    key: "sanitizeStyleNames",
    label: "Sanitize style names",
    description:
      "Renames messy auto-generated style names like 'Normal + Bold + 12pt' into clean, readable labels such as 'Body'.",
  },
  {
    key: "removeEmptyParagraphs",
    label: "Remove empty paragraphs",
    description:
      "Deletes blank paragraphs that contain no visible text — common artifacts from Word import.",
  },
];

const PARAGRAPH_RULE_KEYS = new Set<AutoApplyKey>([
  "smartQuotes",
  "dashes",
  "trimTrailing",
  "tabsToMargin",
  "softToHard",
]);

const PREFLIGHT_KEYS = new Set<AutoApplyKey>([
  "stripUnusedStyles",
  "collapseBlanksToSpacing",
  "normalizeLists",
  "closeOrphanRuns",
  "trimRunBleed",
  "sanitizeStyleNames",
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
          <div className="space-y-0.5">
            {AUTO_APPLY.map((opt) => {
              const on = autoApply[opt.key];
              const row = (
                <label
                  className="flex cursor-pointer items-center justify-between gap-2 rounded px-1.5 py-1 hover:bg-accent/40"
                >
                  <span className="text-[11px] text-foreground">{opt.label}</span>
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 accent-primary"
                    checked={on}
                    onChange={(e) => handleAutoChange(opt.key, e.target.checked)}
                  />
                </label>
              );
              if (!opt.description) {
                return <div key={opt.key}>{row}</div>;
              }
              return (
                <Tooltip key={opt.key}>
                  <TooltipTrigger asChild>{row}</TooltipTrigger>
                  <TooltipContent side="right" className="w-56 space-y-1.5">
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

