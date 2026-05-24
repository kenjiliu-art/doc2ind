import { useMemo, useState } from "react";
import { useEditor } from "@/store/editor";
import type {
  Block,
  ParagraphBlock,
  ParagraphRules,
  ParsedDoc,
  RunSpan,
  StyleDef,
  TableBlock,
} from "@/lib/types";
import { smartQuotes, trimTrailing, dashes, multiSpaces } from "@/lib/cleanup";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tag, TagIcon, MoreHorizontal, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

const BODY_STYLES = new Set(["Body", "Normal", "Default Paragraph Font"]);

/** Stable, distinguishable color per style name. */
function styleColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 70% 45%)`;
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

export function LivePreview() {
  const doc = useEditor((s) => s.doc);
  const [showMarkers, setShowMarkers] = useState(true);

  if (!doc) return null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-9 shrink-0 items-center justify-between gap-2 border-b border-border bg-background/60 px-4 text-[11px]">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Tag className="h-3 w-3" />
          Click any paragraph to edit · hover to select
        </span>
        <label className="flex cursor-pointer items-center gap-1.5 text-muted-foreground hover:text-foreground">
          <input
            type="checkbox"
            checked={showMarkers}
            onChange={(e) => setShowMarkers(e.target.checked)}
            className="h-3 w-3 accent-primary"
          />
          Style markers
        </label>
      </div>

      <div className="flex-1 overflow-y-auto bg-[hsl(220_14%_94%)] px-6 py-8">
        <div className="mx-auto w-full max-w-[760px] rounded-sm bg-white px-16 py-16 text-[13px] leading-[1.55] text-neutral-900 shadow-md">
          <DocPreview doc={doc} showMarkers={showMarkers} />
        </div>
      </div>
    </div>
  );
}

function applyCleanup(text: string, p: ParagraphBlock): string {
  let s = text;
  if (p.rules.smartQuotes) s = smartQuotes(s);
  if (p.rules.dashes) s = dashes(s);
  if (p.rules.multiSpaces !== "none") s = multiSpaces(s, p.rules.multiSpaces);
  if (p.rules.trimTrailing) s = trimTrailing(s);
  return s;
}

function DocPreview({ doc, showMarkers }: { doc: ParsedDoc; showMarkers: boolean }) {
  const styleMap = useMemo(() => {
    const m = new Map<string, StyleDef>();
    for (const s of doc.paragraphStyles) m.set(s.name, s);
    return m;
  }, [doc.paragraphStyles]);

  return (
    <>
      {doc.blocks.map((b) => (
        <BlockView
          key={(b as { id: string }).id}
          block={b}
          styleMap={styleMap}
          charStyles={doc.charStyles}
          showMarkers={showMarkers}
        />
      ))}
    </>
  );
}

function BlockView({
  block,
  styleMap,
  charStyles,
  showMarkers,
}: {
  block: Block;
  styleMap: Map<string, StyleDef>;
  charStyles: ParsedDoc["charStyles"];
  showMarkers: boolean;
}) {
  if (block.kind === "paragraph") {
    return <ParaView p={block} styleMap={styleMap} charStyles={charStyles} showMarkers={showMarkers} />;
  }
  return <TableView t={block} styleMap={styleMap} charStyles={charStyles} showMarkers={showMarkers} />;
}

function TableView({
  t,
  styleMap,
  charStyles,
  showMarkers,
}: {
  t: TableBlock;
  styleMap: Map<string, StyleDef>;
  charStyles: ParsedDoc["charStyles"];
  showMarkers: boolean;
}) {
  return (
    <table className="my-3 w-full border-collapse text-[12px]">
      <tbody>
        {t.rows.map((row, ri) => (
          <tr key={ri}>
            {row.map((cell, ci) => (
              <td key={ci} className="border border-neutral-300 p-2 align-top">
                {cell.paragraphs.map((p) => (
                  <ParaView key={p.id} p={p} styleMap={styleMap} charStyles={charStyles} showMarkers={showMarkers} />
                ))}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function paragraphClasses(p: ParagraphBlock): string {
  switch (p.style) {
    case "Heading 1":
      return "text-[22px] font-bold mt-5 mb-2 leading-tight";
    case "Heading 2":
      return "text-[18px] font-bold mt-4 mb-2 leading-tight";
    case "Heading 3":
      return "text-[15px] font-semibold mt-3 mb-1.5";
    case "Caption":
      return "text-[11px] italic text-neutral-600 my-1";
    case "Quote":
      return "border-l-2 border-neutral-300 pl-3 italic text-neutral-700 my-2";
    case "Label":
      return "text-[10px] uppercase tracking-widest font-semibold text-neutral-600 my-1";
    case "List":
      return "my-0.5";
    default:
      return "my-1.5";
  }
}

function alignmentClass(a?: ParagraphBlock["alignment"]): string {
  switch (a) {
    case "center":
      return "text-center";
    case "right":
      return "text-right";
    case "justify":
      return "text-justify";
    default:
      return "text-left";
  }
}

function runsText(runs: RunSpan[]) {
  return runs.map((r) => (r.text === "\n" ? "↵ " : r.text)).join("");
}

function ParaView({
  p,
  charStyles,
  showMarkers,
}: {
  p: ParagraphBlock;
  styleMap: Map<string, StyleDef>;
  charStyles: ParsedDoc["charStyles"];
  showMarkers: boolean;
}) {
  const selected = useEditor((s) => s.selection.has(p.id));
  const toggleSelect = useEditor((s) => s.toggleSelect);
  const setText = useEditor((s) => s.setText);

  // Track of original vs current
  const orig = p.original;
  let changeCount = 0;
  if (orig) {
    if (p.style !== orig.style) changeCount++;
    if (runsText(p.runs) !== runsText(orig.runs)) changeCount++;
    (Object.keys(RULE_LABELS) as Array<keyof ParagraphRules>).forEach((k) => {
      if (p.rules[k] !== orig.rules[k]) changeCount++;
    });
  }
  const isChanged = changeCount > 0;

  // Soft → hard splits into multiple paragraphs visually
  const groups: RunSpan[][] = [];
  if (p.rules.softToHard) {
    let cur: RunSpan[] = [];
    for (const r of p.runs) {
      if (r.text === "\n") {
        if (cur.length) groups.push(cur);
        cur = [];
      } else cur.push(r);
    }
    if (cur.length) groups.push(cur);
  } else {
    groups.push(p.runs);
  }

  if (groups.length === 0) {
    return (
      <ParaShell
        p={p}
        selected={selected}
        toggleSelect={toggleSelect}
        isChanged={isChanged}
        showMarkers={showMarkers}
      >
        <p className="my-1 text-[11px] italic text-neutral-400">(empty paragraph)</p>
      </ParaShell>
    );
  }

  const cls = cn(paragraphClasses(p), alignmentClass(p.alignment));
  const twipsToPx = (t: number) => (t / 1440) * 96;
  const leftIndent = p.leftIndent ?? 0;
  let firstLine = p.firstLineIndent ?? 0;
  if (p.rules.tabsToMargin && p.leadingTabs > 0) {
    firstLine = Math.max(firstLine, p.leadingTabs * 720);
  }
  const csMap = new Map(charStyles.map((c) => [c.name, c]));

  return (
    <ParaShell
      p={p}
      selected={selected}
      toggleSelect={toggleSelect}
      isChanged={isChanged}
      showMarkers={showMarkers}
    >
      {groups.map((spans, idx) => {
        let working = spans;
        if (p.rules.tabsToMargin && idx === 0) {
          working = [...spans];
          if (working.length && working[0].text.startsWith("\t")) {
            working[0] = { ...working[0], text: working[0].text.replace(/^\t+/, "") };
            if (!working[0].text) working.shift();
          }
        }
        const isPageBreak = idx === 0 && p.rules.pageBreakBefore;

        return (
          <div key={idx}>
            {isPageBreak && (
              <div className="my-4 border-t border-dashed border-neutral-400 pt-1 text-center text-[9px] uppercase tracking-widest text-neutral-400">
                Page break
              </div>
            )}
            <p
              className={cn(cls, "outline-none focus:bg-amber-50/60 focus:ring-1 focus:ring-amber-300 rounded-sm")}
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => {
                if (idx !== 0) return; // only first group writes back; soft-split groups are read-only visuals
                const newText = e.currentTarget.innerText;
                const currentText = runsText(p.runs);
                if (newText !== currentText) setText(p.id, newText);
              }}
              style={{
                marginLeft: leftIndent ? twipsToPx(leftIndent) : undefined,
                textIndent: firstLine && idx === 0 ? twipsToPx(firstLine) : undefined,
              }}
            >
              {p.listKind === "bullet" && idx === 0 && (
                <span className="mr-2 inline-block">•</span>
              )}
              {p.listKind === "number" && idx === 0 && (
                <span className="mr-2 inline-block">1.</span>
              )}
              {working.map((r, i) => {
                if (r.footnoteRef !== undefined) {
                  return (
                    <sup key={i} className="text-[9px] text-neutral-500">
                      [{r.footnoteRef}]
                    </sup>
                  );
                }
                const cs = r.charStyle ? csMap.get(r.charStyle) : undefined;
                let text = applyCleanup(r.text, p);
                text = text.replace(/\t/g, "    ");
                const csColor = r.charStyle && showMarkers ? styleColor(r.charStyle) : undefined;
                return (
                  <span
                    key={i}
                    title={r.charStyle ? `Character style: ${r.charStyle}` : undefined}
                    className={cn(
                      cs?.bold && "font-bold",
                      cs?.italic && "italic",
                      cs?.underline && "underline",
                      cs?.smallCaps && "uppercase tracking-wide text-[0.85em]",
                      csColor && "cursor-help rounded-[2px]",
                    )}
                    style={{
                      ...(cs?.superscript
                        ? { verticalAlign: "super", fontSize: "0.75em" }
                        : cs?.subscript
                          ? { verticalAlign: "sub", fontSize: "0.75em" }
                          : {}),
                      ...(csColor
                        ? {
                            boxShadow: `inset 0 -2px 0 0 ${csColor}`,
                            backgroundColor: `color-mix(in oklab, ${csColor} 8%, transparent)`,
                          }
                        : {}),
                    }}
                  >
                    {text}
                  </span>
                );
              })}
            </p>
          </div>
        );
      })}
    </ParaShell>
  );
}

/** Wraps a paragraph with the hover gutter: selection checkbox, style chip (popover), change indicator. */
function ParaShell({
  p,
  selected,
  toggleSelect,
  isChanged,
  showMarkers,
  children,
}: {
  p: ParagraphBlock;
  selected: boolean;
  toggleSelect: (id: string) => void;
  isChanged: boolean;
  showMarkers: boolean;
  children: React.ReactNode;
}) {
  const paraIsStyled = showMarkers && !BODY_STYLES.has(p.style);
  const paraColor = paraIsStyled ? styleColor(p.style) : undefined;

  return (
    <div
      className={cn(
        "group/para relative -mx-3 rounded-md px-3 transition-colors",
        selected && "bg-primary/5 ring-1 ring-primary/40",
        !selected && isChanged && "bg-amber-50/40",
        !selected && "hover:bg-neutral-50",
      )}
    >
      {/* Left edge: change/style bar */}
      {(paraIsStyled || isChanged) && (
        <span
          aria-hidden
          className="pointer-events-none absolute left-0 top-1 bottom-1 w-[3px] rounded-full"
          style={{ backgroundColor: isChanged ? "rgb(245 158 11)" : paraColor }}
          title={isChanged ? "Modified from source" : undefined}
        />
      )}

      {/* Hover gutter: selection + style chip + overrides */}
      <div className="pointer-events-none absolute -left-2 top-1 -translate-x-full opacity-0 transition-opacity group-hover/para:opacity-100 group-focus-within/para:opacity-100">
        <div className="pointer-events-auto flex items-center gap-1.5 rounded-md border border-border bg-background px-1.5 py-1 shadow-sm">
          <Checkbox
            checked={selected}
            onCheckedChange={() => toggleSelect(p.id)}
            className="h-3.5 w-3.5"
            aria-label="Select paragraph"
          />
          <StyleChipPopover p={p} color={paraColor} isChanged={isChanged} />
        </div>
      </div>

      {/* Selected: always show chip */}
      {selected && (
        <div className="pointer-events-none absolute -left-2 top-1 -translate-x-full">
          <div className="pointer-events-auto flex items-center gap-1.5 rounded-md border border-primary bg-background px-1.5 py-1 shadow-sm">
            <Checkbox
              checked
              onCheckedChange={() => toggleSelect(p.id)}
              className="h-3.5 w-3.5"
              aria-label="Deselect paragraph"
            />
          </div>
        </div>
      )}

      {children}
    </div>
  );
}

function StyleChipPopover({
  p,
  color,
  isChanged,
}: {
  p: ParagraphBlock;
  color?: string;
  isChanged: boolean;
}) {
  const styles = useEditor((s) => s.doc?.paragraphStyles) ?? [];
  const setStyle = useEditor((s) => s.setStyle);
  const updateParagraphRule = useEditor((s) => s.updateParagraphRule);
  const revertAll = useEditor((s) => s.revertParagraph);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm"
          style={{ backgroundColor: color ?? "rgb(115 115 115)" }}
          title="Edit paragraph style & overrides"
        >
          <TagIcon className="h-2.5 w-2.5" />
          {p.style}
          <MoreHorizontal className="h-2.5 w-2.5 opacity-70" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" side="left" className="w-64 p-3 text-xs">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Paragraph style
          </span>
          <select
            value={p.style}
            onChange={(e) => setStyle(p.id, e.target.value)}
            className="w-full rounded border border-border bg-background px-2 py-1 text-xs font-medium"
          >
            {styles.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <p className="mt-3 mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Overrides
        </p>
        <OverrideRow
          label="Page break before"
          checked={p.rules.pageBreakBefore}
          onChange={(v) => updateParagraphRule(p.id, "pageBreakBefore", v)}
        />
        <OverrideRow
          label="Keep with next"
          checked={p.rules.keepWithNext}
          onChange={(v) => updateParagraphRule(p.id, "keepWithNext", v)}
        />

        <p className="mt-3 mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Skip cleanups here
        </p>
        <OverrideRow
          label="Smart quotes"
          checked={!p.rules.smartQuotes}
          onChange={(v) => updateParagraphRule(p.id, "smartQuotes", !v)}
        />
        <OverrideRow
          label="Em dashes"
          checked={!p.rules.dashes}
          onChange={(v) => updateParagraphRule(p.id, "dashes", !v)}
        />
        <OverrideRow
          label="Trim trailing"
          checked={!p.rules.trimTrailing}
          onChange={(v) => updateParagraphRule(p.id, "trimTrailing", !v)}
        />

        {isChanged && (
          <button
            type="button"
            onClick={() => revertAll(p.id)}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-[11px] font-semibold text-amber-700 hover:bg-amber-500/20 dark:text-amber-300"
          >
            <RotateCcw className="h-3 w-3" />
            Revert this paragraph
          </button>
        )}

        {p.blanksBefore > 0 || p.leadingTabs > 0 || p.hasSoftBreaks || p.fontSize ? (
          <div className="mt-3 flex flex-wrap gap-1 border-t border-border pt-2">
            {p.blanksBefore > 0 && (
              <Badge>{p.blanksBefore} blank before</Badge>
            )}
            {p.leadingTabs > 0 && <Badge>{p.leadingTabs} tab</Badge>}
            {p.hasSoftBreaks && <Badge>soft breaks</Badge>}
            {p.fontSize && <Badge>{p.fontSize / 2}pt</Badge>}
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

function OverrideRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 hover:bg-accent">
      <Checkbox
        checked={checked}
        onCheckedChange={(v) => onChange(!!v)}
        className="h-3.5 w-3.5"
      />
      <span className="text-[11px] text-foreground">{label}</span>
    </label>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
      {children}
    </span>
  );
}
