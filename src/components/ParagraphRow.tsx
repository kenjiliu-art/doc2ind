import { useEditor } from "@/store/editor";
import type { ParagraphBlock, ParagraphRules, StyleDef } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const EMPTY_STYLES: StyleDef[] = [];

interface Props {
  paragraph: ParagraphBlock;
  compact?: boolean;
}

const RULE_LABELS: Record<keyof ParagraphRules, string> = {
  tabsToMargin: "Tabs→indent",
  softToHard: "Soft→hard",
  pageBreakBefore: "Page break before",
  keepWithNext: "Keep with next",
  smartQuotes: "Smart quotes",
  dashes: "Em dashes",
  trimTrailing: "Trim spaces",
  multiSpaces: "Multi-space",
};

function runsText(runs: ParagraphBlock["runs"]) {
  return runs.map((r) => (r.text === "\n" ? "↵ " : r.text)).join("");
}

export function ParagraphRow({ paragraph: p, compact }: Props) {
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

  // Overrides = local toggles that differ from doc default behavior
  const overrideBadges: string[] = [];
  if (p.rules.pageBreakBefore) overrideBadges.push("page break");
  if (p.rules.keepWithNext) overrideBadges.push("keep next");

  const hasChanges = changes.length > 0;

  return (
    <div
      className={cn(
        "group flex gap-3 rounded-md border p-2",
        selected
          ? "border-primary bg-accent/40"
          : hasChanges
            ? "border-amber-500/60 bg-amber-500/5"
            : "border-transparent hover:border-border hover:bg-accent/20",
        compact && "text-xs",
      )}
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

          {p.blanksBefore > 0 && <SrcBadge>{p.blanksBefore} blank{p.blanksBefore > 1 ? "s" : ""} before</SrcBadge>}
          {p.leadingTabs > 0 && <SrcBadge>{p.leadingTabs} tab{p.leadingTabs > 1 ? "s" : ""}</SrcBadge>}
          {p.hasSoftBreaks && <SrcBadge>soft breaks</SrcBadge>}
          {p.fontSize && <SrcBadge>{p.fontSize / 2}pt</SrcBadge>}

          {overrideBadges.map((b) => (
            <span
              key={b}
              className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
            >
              {b}
            </span>
          ))}

          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                title="Per-paragraph overrides"
                className="ml-auto rounded border border-transparent p-1 text-muted-foreground hover:border-border hover:bg-background hover:text-foreground"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-3 text-xs">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Overrides
              </p>
              <OverrideRow
                label="Page break before"
                hint="Force a page break before this paragraph."
                checked={p.rules.pageBreakBefore}
                onChange={(v) => updateParagraphRule(p.id, "pageBreakBefore", v)}
              />
              <OverrideRow
                label="Keep with next"
                hint="Prevent a break between this paragraph and the next."
                checked={p.rules.keepWithNext}
                onChange={(v) => updateParagraphRule(p.id, "keepWithNext", v)}
              />
              <div className="mt-3 border-t border-border pt-2">
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Skip cleanups here
                </p>
                <OverrideRow
                  label="Smart quotes"
                  hint="Leave straight quotes in this paragraph alone."
                  checked={!p.rules.smartQuotes}
                  onChange={(v) => updateParagraphRule(p.id, "smartQuotes", !v)}
                />
                <OverrideRow
                  label="Em dashes"
                  hint="Leave -- in this paragraph alone."
                  checked={!p.rules.dashes}
                  onChange={(v) => updateParagraphRule(p.id, "dashes", !v)}
                />
                <OverrideRow
                  label="Trim trailing"
                  hint="Keep trailing spaces in this paragraph."
                  checked={!p.rules.trimTrailing}
                  onChange={(v) => updateParagraphRule(p.id, "trimTrailing", !v)}
                />
              </div>
            </PopoverContent>
          </Popover>
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

function SrcBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
      {children}
    </span>
  );
}

function OverrideRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 rounded-md px-1.5 py-1 hover:bg-accent">
      <Checkbox
        checked={checked}
        onCheckedChange={(v) => onChange(!!v)}
        className="mt-0.5 h-3.5 w-3.5"
      />
      <span className="flex-1">
        <span className="block text-[11px] font-semibold text-foreground">{label}</span>
        <span className="block text-[10px] text-muted-foreground">{hint}</span>
      </span>
    </label>
  );
}
