import { useEditor, type PreflightAction } from "@/store/editor";
import type { ParagraphRules } from "@/lib/types";
import { Sparkles } from "lucide-react";

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

export function CleanupBar() {
  const applyDocCleanup = useEditor((s) => s.applyDocCleanup);
  const applyDocMultiSpaces = useEditor((s) => s.applyDocMultiSpaces);
  const runPreflight = useEditor((s) => s.runPreflight);
  const footnoteCount = useEditor((s) => s.doc?.footnotes.length ?? 0);

  return (
    <div className="space-y-4 px-3 py-3 text-xs">
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
  );
}
