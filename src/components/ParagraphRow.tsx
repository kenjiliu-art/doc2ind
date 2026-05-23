import { useEditor } from "@/store/editor";
import type { ParagraphBlock, ParagraphRules } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";

const RULE_LABELS: Array<{ key: keyof ParagraphRules; label: string; title: string }> = [
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

export function ParagraphRow({ paragraph: p, compact }: Props) {
  const doc = useEditor((s) => s.doc);
  const selected = useEditor((s) => s.selection.has(p.id));
  const toggleSelect = useEditor((s) => s.toggleSelect);
  const updateParagraphRule = useEditor((s) => s.updateParagraphRule);
  const setStyle = useEditor((s) => s.setStyle);
  const setText = useEditor((s) => s.setText);

  const text = p.runs.map((r) => (r.text === "\n" ? "↵ " : r.text)).join("");
  const isEmpty = p.runs.length === 0;
  const styles = doc?.paragraphStyles ?? [];

  return (
    <div
      className={`group flex gap-3 rounded-md border p-2 ${
        selected ? "border-primary bg-accent/40" : "border-transparent hover:border-border hover:bg-accent/20"
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
          {p.fontSize && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {p.fontSize / 2}pt
            </span>
          )}

          <div className="ml-auto flex flex-wrap gap-x-3 gap-y-1">
            {RULE_LABELS.map(({ key, label, title }) => (
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
      </div>
    </div>
  );
}
