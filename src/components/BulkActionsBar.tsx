import { useEditor } from "@/store/editor";
import type { ParagraphRules } from "@/lib/types";
import { useMemo } from "react";

const BULK_RULES: Array<{ key: keyof ParagraphRules; label: string }> = [
  { key: "tabsToMargin", label: "Tabs→indent" },
  { key: "softToHard", label: "Soft→hard" },
  { key: "pageBreakBefore", label: "Page break before" },
  { key: "keepWithNext", label: "Keep with next" },
  { key: "smartQuotes", label: "Smart quotes" },
  { key: "dashes", label: "Em dashes" },
  { key: "trimTrailing", label: "Trim trailing" },
];

export function BulkActionsBar() {
  const doc = useEditor((s) => s.doc);
  const selection = useEditor((s) => s.selection);
  const selectAll = useEditor((s) => s.selectAll);
  const clearSelection = useEditor((s) => s.clearSelection);
  const bulkSetStyle = useEditor((s) => s.bulkSetStyle);
  const bulkToggleRule = useEditor((s) => s.bulkToggleRule);

  const count = selection.size;
  const styles = useMemo(() => doc?.paragraphStyles ?? [], [doc]);

  return (
    <div className="border-t border-border bg-muted/40">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 px-6 py-2 text-xs">
        <span className="font-medium">
          {count > 0 ? `${count} selected` : "Bulk actions"}
        </span>
        <button
          className="rounded border border-border bg-background px-2 py-1 hover:bg-accent"
          onClick={selectAll}
        >
          Select all
        </button>
        <button
          className="rounded border border-border bg-background px-2 py-1 hover:bg-accent disabled:opacity-50"
          onClick={clearSelection}
          disabled={count === 0}
        >
          Clear
        </button>

        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">Style:</span>
          <select
            disabled={count === 0}
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                bulkSetStyle(e.target.value);
                e.target.value = "";
              }
            }}
            className="rounded border border-border bg-background px-2 py-1 disabled:opacity-50"
          >
            <option value="">Apply…</option>
            {styles.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground">Rule:</span>
          {BULK_RULES.map((r) => (
            <div key={r.key} className="flex gap-1">
              <button
                disabled={count === 0}
                onClick={() => bulkToggleRule(r.key, true)}
                className="rounded border border-border bg-background px-2 py-1 hover:bg-accent disabled:opacity-50"
              >
                +{r.label}
              </button>
              <button
                disabled={count === 0}
                onClick={() => bulkToggleRule(r.key, false)}
                className="rounded border border-border bg-background px-2 py-1 hover:bg-accent disabled:opacity-50"
              >
                −{r.label}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
