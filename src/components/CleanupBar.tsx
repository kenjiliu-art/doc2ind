import { useState } from "react";
import { useEditor, type PreflightAction } from "@/store/editor";
import { useSettings, type AutoApplyKey } from "@/store/settings";
import type { ParagraphRules } from "@/lib/types";
import { Sparkles, Settings2, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

const DOC_CLEANUPS: Array<{ keys: Array<Exclude<keyof ParagraphRules, "multiSpaces">>; label: string }> = [
  { keys: ["smartQuotes"], label: "Smart quotes" },
  { keys: ["dashes"], label: "Em dashes" },
  { keys: ["trimTrailing"], label: "Trim trailing" },
  { keys: ["smartQuotes", "dashes", "trimTrailing"], label: "All cleanups" },
];

const PREFLIGHT: Array<{ action: PreflightAction; label: string; hint: string }> = [
  { action: "stripUnusedStyles", label: "Strip unused styles", hint: "Drop style defs no paragraph references." },
  { action: "collapseBlanksToSpacing", label: "Blank lines → spacing", hint: "Convert blank paragraphs into style space-after." },
  { action: "normalizeLists", label: "Normalize lists", hint: "Detect bullet/number prefixes and convert to real lists." },
  { action: "closeOrphanRuns", label: "Close orphan runs", hint: "Stop italic/bold from leaking past trailing spaces." },
  { action: "sectionBreaksToPageBreaks", label: "Section → page break", hint: "Promote Word section breaks to clean page breaks." },
  { action: "sanitizeStyleNames", label: "Sanitize style names", hint: "Rename messy 'Normal + Bold + …' styles." },
];

const AUTO_APPLY_OPTIONS: Array<{ key: AutoApplyKey; label: string; hint: string }> = [
  { key: "tabsToMargin", label: "Tabs → indent", hint: "Convert leading tabs to first-line indent on import." },
  { key: "softToHard", label: "Soft → hard breaks", hint: "Split soft line breaks into separate paragraphs." },
  { key: "pageBreakBefore", label: "Section → page break", hint: "Turn section breaks into a clean page break." },
  { key: "smartQuotes", label: "Smart quotes", hint: "Straight quotes become curly quotes." },
  { key: "dashes", label: "Em dashes", hint: "‘--’ becomes em dash." },
  { key: "trimTrailing", label: "Trim trailing spaces", hint: "Strip trailing whitespace from paragraphs." },
];

type Tab = "cleanup" | "auto";

export function CleanupBar() {
  const [tab, setTab] = useState<Tab>("cleanup");
  const applyDocCleanup = useEditor((s) => s.applyDocCleanup);
  const applyDocMultiSpaces = useEditor((s) => s.applyDocMultiSpaces);
  const runPreflight = useEditor((s) => s.runPreflight);
  const footnoteCount = useEditor((s) => s.doc?.footnotes.length ?? 0);
  const autoApply = useSettings((s) => s.autoApply);
  const setAutoApply = useSettings((s) => s.setAutoApply);
  const resetAutoApply = useSettings((s) => s.resetAutoApply);

  return (
    <div className="space-y-3 px-3 py-3 text-xs">
      <div className="flex gap-1 rounded-md border border-border bg-muted/30 p-0.5">
        <TabBtn active={tab === "cleanup"} onClick={() => setTab("cleanup")} icon={<Wand2 className="h-3 w-3" />}>
          Cleanup
        </TabBtn>
        <TabBtn active={tab === "auto"} onClick={() => setTab("auto")} icon={<Settings2 className="h-3 w-3" />}>
          Auto-apply
        </TabBtn>
      </div>

      {tab === "cleanup" ? (
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Doc-wide cleanup
            </p>
            <div className="flex flex-wrap gap-1.5">
              {DOC_CLEANUPS.map((c) => (
                <div key={c.label} className="inline-flex overflow-hidden rounded-md border border-border">
                  <button
                    onClick={() => applyDocCleanup(c.keys, true)}
                    className="bg-background px-2 py-1 hover:bg-accent"
                    title={`Enable: ${c.label}`}
                  >
                    {c.label}
                  </button>
                  <button
                    onClick={() => applyDocCleanup(c.keys, false)}
                    className="border-l border-border bg-muted/40 px-1.5 py-1 text-muted-foreground hover:bg-accent"
                    title="Disable"
                  >
                    off
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="text-muted-foreground">Multi spaces:</span>
              {(["en", "em", "none"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => applyDocMultiSpaces(v)}
                  className="rounded-md border border-border bg-background px-2 py-1 hover:bg-accent"
                >
                  {v === "none" ? "off" : v}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary">
              <Sparkles className="h-3 w-3" /> Pre-flight for InDesign
            </p>
            <div className="space-y-1">
              {PREFLIGHT.map((p) => (
                <button
                  key={p.action}
                  onClick={() => runPreflight(p.action)}
                  className="group flex w-full items-start justify-between gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 text-left hover:border-primary hover:bg-accent"
                  title={p.hint}
                >
                  <span className="font-medium text-foreground">{p.label}</span>
                  <span className="shrink-0 text-[10px] text-muted-foreground group-hover:text-primary">Run →</span>
                </button>
              ))}
            </div>
            {footnoteCount > 0 && (
              <p className="mt-2 text-[10px] text-muted-foreground">
                {footnoteCount} footnote{footnoteCount === 1 ? "" : "s"} detected — exported inline.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            These rules are applied automatically when a document is imported. Turn any of them off to import as-is.
          </p>
          <div className="space-y-1.5">
            {AUTO_APPLY_OPTIONS.map((opt) => {
              const on = autoApply[opt.key];
              return (
                <label
                  key={opt.key}
                  className="flex cursor-pointer items-start gap-2 rounded-md border border-border bg-background px-2.5 py-2 hover:border-primary"
                  title={opt.hint}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-3.5 w-3.5 accent-primary"
                    checked={on}
                    onChange={(e) => setAutoApply(opt.key, e.target.checked)}
                  />
                  <span className="flex-1">
                    <span className="block text-[11px] font-semibold text-foreground">{opt.label}</span>
                    <span className="block text-[10px] text-muted-foreground">{opt.hint}</span>
                  </span>
                </label>
              );
            })}
          </div>
          <button
            onClick={resetAutoApply}
            className="w-full rounded-md border border-border bg-muted/30 px-2 py-1.5 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            Reset to defaults (all on)
          </button>
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            Settings take effect on the next document you import. Use the Cleanup tab to toggle rules on the current doc.
          </p>
        </div>
      )}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 rounded-sm px-2 py-1 text-[11px] font-semibold transition",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {children}
    </button>
  );
}
