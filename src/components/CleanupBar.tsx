import { useEditor } from "@/store/editor";
import type { ParagraphRules } from "@/lib/types";

const DOC_CLEANUPS: Array<{ keys: Array<Exclude<keyof ParagraphRules, "multiSpaces">>; label: string }> = [
  { keys: ["smartQuotes"], label: "Smart quotes" },
  { keys: ["dashes"], label: "Em dashes" },
  { keys: ["trimTrailing"], label: "Trim trailing" },
  { keys: ["smartQuotes", "dashes", "trimTrailing"], label: "All cleanups" },
];

export function CleanupBar() {
  const applyDocCleanup = useEditor((s) => s.applyDocCleanup);
  const applyDocMultiSpaces = useEditor((s) => s.applyDocMultiSpaces);
  return (
    <div className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-2 px-6 py-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Doc-wide:</span>
        {DOC_CLEANUPS.map((c) => (
          <div key={c.label} className="flex gap-1">
            <button
              onClick={() => applyDocCleanup(c.keys, true)}
              className="rounded border border-border bg-background px-2 py-1 hover:bg-accent"
            >
              {c.label} on
            </button>
            <button
              onClick={() => applyDocCleanup(c.keys, false)}
              className="rounded border border-border bg-background px-2 py-1 hover:bg-accent"
            >
              off
            </button>
          </div>
        ))}
        <div className="flex gap-1">
          <span className="text-muted-foreground">Multi spaces:</span>
          {(["en", "em", "none"] as const).map((v) => (
            <button
              key={v}
              onClick={() => applyDocMultiSpaces(v)}
              className="rounded border border-border bg-background px-2 py-1 hover:bg-accent"
            >
              {v === "none" ? "off" : v}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
