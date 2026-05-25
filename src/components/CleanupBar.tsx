import { useEditor, type PreflightAction } from "@/store/editor";
import { useSettings, type AutoApplyKey } from "@/store/settings";
import { Sparkles, Check, Info } from "lucide-react";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

const AUTO_APPLY: Array<{ key: AutoApplyKey; label: string }> = [
  { key: "smartQuotes", label: "Smart quotes" },
  { key: "dashes", label: "Em dashes" },
  { key: "trimTrailing", label: "Trim trailing spaces" },
  { key: "tabsToMargin", label: "Tabs → indent" },
  { key: "softToHard", label: "Soft → hard breaks" },
  { key: "pageBreakBefore", label: "Section → page break" },
  { key: "stripUnusedStyles", label: "Strip unused styles" },
];

const PREFLIGHT: Array<{
  action: PreflightAction;
  label: string;
  description: string;
}> = [
  {
    action: "collapseBlanksToSpacing",
    label: "Blanks → spacing",
    description:
      "Converts blank lines between paragraphs into extra space-after on the preceding paragraph's style, eliminating visual gaps.",
  },
  {
    action: "normalizeLists",
    label: "Normalize lists",
    description:
      "Detects bullet or number prefixes in paragraph text and converts them into proper list paragraphs with consistent formatting.",
  },
  {
    action: "closeOrphanRuns",
    label: "Close orphan runs",
    description:
      "Moves trailing whitespace out of styled character runs so bold or italic formatting does not bleed into surrounding text.",
  },
  {
    action: "trimRunBleed",
    label: "Trim italic/bold bleed",
    description:
      "Strips trailing punctuation AND whitespace out of italic/bold/underline runs — fixes the classic 'italics won't stop after the styled word' Word import bug.",
  },
  {
    action: "sanitizeStyleNames",
    label: "Sanitize style names",
    description:
      "Renames messy auto-generated style names like 'Normal + Bold + 12pt' into clean, readable labels such as 'Body'.",
  },
];

export function CleanupBar() {
  const runPreflight = useEditor((s) => s.runPreflight);
  const preflightHistory = useEditor((s) => s.preflightHistory);
  const applyDocCleanup = useEditor((s) => s.applyDocCleanup);
  const autoApply = useSettings((s) => s.autoApply);
  const setAutoApply = useSettings((s) => s.setAutoApply);

  const handleAutoChange = (key: AutoApplyKey, checked: boolean) => {
    setAutoApply(key, checked);
    if (key === "stripUnusedStyles") {
      if (checked) runPreflight("stripUnusedStyles");
    } else if (key !== "pageBreakBefore") {
      applyDocCleanup([key], checked);
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-4 px-3 py-3 text-xs">
        <section>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Auto-apply on import
          </p>
          <div className="space-y-0.5">
            {AUTO_APPLY.map((opt) => {
              const on = autoApply[opt.key];
              return (
                <label
                  key={opt.key}
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
            })}
          </div>
        </section>

        <section>
          <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary">
            <Sparkles className="h-3 w-3" /> Pre-flight
          </p>
          <div className="space-y-1">
            {PREFLIGHT.map((p) => {
              const hasRun = preflightHistory.has(p.action);
              return (
                <Tooltip key={p.action}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => runPreflight(p.action)}
                      className="flex w-full items-center justify-between rounded border border-border bg-background px-2 py-1.5 text-left text-[11px] hover:border-primary hover:bg-accent"
                    >
                      <span className="flex items-center gap-1.5">
                        {hasRun && (
                          <Check className="h-3 w-3 shrink-0 text-emerald-500" />
                        )}
                        <span className={hasRun ? "text-muted-foreground" : "text-foreground"}>
                          {p.label}
                        </span>
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        {hasRun && <span className="text-emerald-500">Done</span>}
                        <span>Run →</span>
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="w-56 space-y-1.5">
                    <p className="text-[11px] font-semibold text-foreground">{p.label}</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {p.description}
                    </p>
                    {hasRun && (
                      <p className="text-[10px] text-emerald-500 font-medium">
                        This tool has already been run on the current document.
                      </p>
                    )}
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
