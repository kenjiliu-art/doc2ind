import { useEditor } from "@/store/editor";
import type { ParagraphBlock, ParagraphRules, StyleDef } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";

const EMPTY_STYLES: StyleDef[] = [];

const BOOL_RULES: Array<{ key: Exclude<keyof ParagraphRules, "multiSpaces">; label: string; title: string }> = [
  { key: "tabsToMargin", label: "Tabs→indent", title: "Convert leading tabs and first-line indent to paragraph margin" },
  { key: "softToHard", label: "Soft→hard", title: "Split soft line breaks into separate paragraphs" },
  { key: "pageBreakBefore", label: "Page break", title: "Insert page break before this paragraph" },
  { key: "keepWithNext", label: "Keep next", title: "Keep with next paragraph" },
  { key: "smartQuotes", label: "Smart quotes", title: "Standardize straight quotes to curly" },
  { key: "dashes", label: "Em dashes", title: "Convert -- and --- to em dash" },
  { key: "trimTrailing", label: "Trim spaces", title: "Remove trailing whitespace" },
];

interface Props {
  paragraph: ParagraphBlock;
  compact?: boolean;
}

const RULE_LABELS: Record<keyof ParagraphRules, string> = {
  tabsToMargin: "Tabs→indent",
  softToHard: "Soft→hard",
  pageBreakBefore: "Page break above",
  pageBreakAfter: "Page break below",
  keepWithNext: "Keep next",
  smartQuotes: "Smart quotes",
  dashes: "Em dashes",
  trimTrailing: "Trim spaces",
  multiSpaces: "Multi-space",
};

function runsText(runs: ParagraphBlock["runs"]) {
  return runs.map((r) => (r.text === "\n" ? "↵ " : r.text)).join("");
}

export function ParagraphRow({ paragraph: p, compact }: Props) {
  // Narrow selectors: only the slices this row actually uses.
  // Subscribing to the whole `doc` made every paragraph re-render on
  // every keystroke or rule toggle (O(N²) for N paragraphs).
  const styles = useEditor((s) => s.doc?.paragraphStyles) ?? EMPTY_STYLES;
  const selected = useEditor((s) => s.selection.has(p.id));
  const toggleSelect = useEditor((s) => s.toggleSelect);
  const updateParagraphRule = useEditor((s) => s.updateParagraphRule);
  const setStyle = useEditor((s) => s.setStyle);
  const setText = useEditor((s) => s.setText);
  const revertField = useEditor((s) => s.revertParagraphField);
  const revertAll = useEditor((s) => s.revertParagraph);

  const text = runsText(p.runs);
  const isEmpty = p.runs.length === 0;

  // Compute diffs vs original
  const orig = p.original;
  const changes: Array<{ key: "style" | "runs" | keyof ParagraphRules; label: string; detail: string }> = [];
  if (orig) {
    if (p.style !== orig.style)
      changes.push({ key: "style", label: "Style", detail: `${orig.style} → ${p.style}` });
    if (runsText(p.runs) !== runsText(orig.runs))
      changes.push({ key: "runs", label: "Text", detail: "edited" });
    (Object.keys(RULE_LABELS) as Array<keyof ParagraphRules>).forEach((k) => {
      if (p.rules[k] !== orig.rules[k]) {
        changes.push({
          key: k,
          label: RULE_LABELS[k],
          detail: `${String(orig.rules[k])} → ${String(p.rules[k])}`,
        });
      }
    });
  }

  const hasChanges = changes.length > 0;

  return (
    <div
      className={`group flex gap-3 rounded-md border p-2 ${
        selected
          ? "border-primary bg-accent/40"
          : hasChanges
            ? "border-amber-500/60 bg-amber-500/5"
            : "border-transparent hover:border-border hover:bg-accent/20"
      } ${compact ? "text-xs" : ""}`}
    >
      <div className="flex flex-col items-center gap-1 pt-1">
        <Checkbox
          checked={selected}
          onCheckedChange={() => toggleSelect(p.id)}
          aria-label="Select paragraph"
        />
        <div className="text-[10px] text-muted-foreground">#{p.id.slice(1)}</div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={p.style}
            onChange={(e) => setStyle(p.id, e.target.value)}
            className="rounded border border-border bg-background px-2 py-0.5 text-xs font-medium"
          >
            {styles.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>

          {p.rules.pageBreakBefore && (
            <span
              title={`Page break before. InDesign will only honor this if the "${p.style}" paragraph style has "Start Paragraph: On Next Page" set in Keep Options.`}
              className="rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
            >
              ⤓ New page ({p.style})
            </span>
          )}

          {p.blanksBefore > 0 && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {p.blanksBefore} blank{p.blanksBefore > 1 ? "s" : ""} before
            </span>
          )}
          {p.leadingTabs > 0 && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {p.leadingTabs} tab{p.leadingTabs > 1 ? "s" : ""}
            </span>
          )}
          {p.hasSoftBreaks && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              soft breaks
            </span>
          )}
          {p.hasMultiSpaces && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              multi spaces
            </span>
          )}
          {p.fontSize && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {p.fontSize / 2}pt
            </span>
          )}

          <div className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-1">
            {BOOL_RULES.map(({ key, label, title }) => (
              <label
                key={key}
                title={title}
                className="flex items-center gap-1 text-[11px] text-muted-foreground"
              >
                <Checkbox
                  checked={p.rules[key]}
                  onCheckedChange={(v) => updateParagraphRule(p.id, key, !!v)}
                  className="h-3.5 w-3.5"
                />
                {label}
              </label>
            ))}
            <label className="flex items-center gap-1 text-[11px] text-muted-foreground" title="Replace multiple spaces with en or em spaces">
              <span>multi space</span>
              <select
                value={p.rules.multiSpaces}
                onChange={(e) => updateParagraphRule(p.id, "multiSpaces", e.target.value as "none" | "en" | "em")}
                className="rounded border border-border bg-background px-1 py-0.5 text-[11px]"
              >
                <option value="none">—</option>
                <option value="en">en</option>
                <option value="em">em</option>
              </select>
            </label>
          </div>
        </div>

        {isEmpty ? (
          <div className="mt-1 select-none px-1 py-0.5 text-xs italic text-muted-foreground">
            (empty paragraph)
          </div>
        ) : (
          <div
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => {
              const newText = e.currentTarget.innerText;
              if (newText !== text) setText(p.id, newText);
            }}
            className="mt-1 rounded px-1 py-0.5 text-sm leading-relaxed outline-none focus:bg-background focus:ring-1 focus:ring-ring"
          >
            {text}
          </div>
        )}

        {hasChanges && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-amber-500/20 pt-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
              {changes.length} change{changes.length > 1 ? "s" : ""}
            </span>
            {changes.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => revertField(p.id, c.key)}
                title={`Revert: ${c.detail}`}
                className="group/chg inline-flex items-center gap-1 rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-700 hover:bg-amber-500/20 dark:text-amber-300"
              >
                <span>{c.label}</span>
                <span className="opacity-50 group-hover/chg:opacity-100">↺</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => revertAll(p.id)}
              className="ml-auto rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-accent"
            >
              Revert all
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
