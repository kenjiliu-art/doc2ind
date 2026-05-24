import { useEditor, type PreflightAction } from "@/store/editor";
import { useSettings, type AutoApplyKey } from "@/store/settings";
import { Sparkles } from "lucide-react";

const AUTO_APPLY: Array<{ key: AutoApplyKey; label: string }> = [
  { key: "smartQuotes", label: "Smart quotes" },
  { key: "dashes", label: "Em dashes" },
  { key: "trimTrailing", label: "Trim trailing spaces" },
  { key: "tabsToMargin", label: "Tabs → indent" },
  { key: "softToHard", label: "Soft → hard breaks" },
  { key: "pageBreakBefore", label: "Section → page break" },
];

const PREFLIGHT: Array<{ action: PreflightAction; label: string }> = [
  { action: "stripUnusedStyles", label: "Strip unused styles" },
  { action: "collapseBlanksToSpacing", label: "Blanks → spacing" },
  { action: "normalizeLists", label: "Normalize lists" },
  { action: "closeOrphanRuns", label: "Close orphan runs" },
  { action: "sanitizeStyleNames", label: "Sanitize style names" },
];

export function CleanupBar() {
  const runPreflight = useEditor((s) => s.runPreflight);
  const applyDocCleanup = useEditor((s) => s.applyDocCleanup);
  const autoApply = useSettings((s) => s.autoApply);
  const setAutoApply = useSettings((s) => s.setAutoApply);

  return (
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
                  onChange={(e) => {
                    setAutoApply(opt.key, e.target.checked);
                    // Also apply to the currently loaded doc so the preview updates live.
                    if (opt.key !== "pageBreakBefore") {
                      applyDocCleanup([opt.key], e.target.checked);
                    }
                  }}
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
          {PREFLIGHT.map((p) => (
            <button
              key={p.action}
              onClick={() => runPreflight(p.action)}
              className="flex w-full items-center justify-between rounded border border-border bg-background px-2 py-1.5 text-left text-[11px] hover:border-primary hover:bg-accent"
            >
              <span>{p.label}</span>
              <span className="text-[10px] text-muted-foreground">Run →</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
