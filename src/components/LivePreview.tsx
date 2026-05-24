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
import { Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";

const QUICK_RULES: Array<{ key: Exclude<keyof ParagraphRules, "multiSpaces">; label: string }> = [
  { key: "smartQuotes", label: "Smart quotes" },
  { key: "dashes", label: "Em dash" },
  { key: "trimTrailing", label: "Trim" },
  { key: "tabsToMargin", label: "Tabs→indent" },
  { key: "softToHard", label: "Soft→hard" },
  { key: "pageBreakBefore", label: "Page break" },
];

interface LivePreviewProps {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function LivePreview({ selectedId, onSelect }: LivePreviewProps) {
  const doc = useEditor((s) => s.doc);
  if (!doc) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No document
      </div>
    );
  }
  return (
    <div className="h-full overflow-y-auto bg-[hsl(220_14%_94%)] px-6 py-8">
      <div className="mx-auto w-full max-w-[760px] rounded-sm bg-white px-14 py-16 text-[13px] leading-[1.55] text-neutral-900 shadow-md">
        <DocPreview doc={doc} selectedId={selectedId} onSelect={onSelect} />
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

function DocPreview({
  doc,
  selectedId,
  onSelect,
}: {
  doc: ParsedDoc;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
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
          selectedId={selectedId}
          onSelect={onSelect}
          styles={doc.paragraphStyles}
        />
      ))}
    </>
  );
}

interface BlockViewProps {
  block: Block;
  styleMap: Map<string, StyleDef>;
  charStyles: ParsedDoc["charStyles"];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  styles: StyleDef[];
}

function BlockView(props: BlockViewProps) {
  if (props.block.kind === "paragraph") return <ParaView {...props} p={props.block} />;
  return <TableView {...props} t={props.block} />;
}

function TableView({
  t,
  styleMap,
  charStyles,
  selectedId,
  onSelect,
  styles,
}: BlockViewProps & { t: TableBlock }) {
  return (
    <table className="my-3 w-full border-collapse text-[12px]">
      <tbody>
        {t.rows.map((row, ri) => (
          <tr key={ri}>
            {row.map((cell, ci) => (
              <td key={ci} className="border border-neutral-300 p-2 align-top">
                {cell.paragraphs.map((p) => (
                  <ParaView
                    key={p.id}
                    p={p}
                    block={p}
                    styleMap={styleMap}
                    charStyles={charStyles}
                    selectedId={selectedId}
                    onSelect={onSelect}
                    styles={styles}
                  />
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
  selectedId,
  onSelect,
  styles,
}: BlockViewProps & { p: ParagraphBlock }) {
  const isSelected = selectedId === p.id;
  const hasChanges =
    !!p.original &&
    (p.style !== p.original.style ||
      runsText(p.runs) !== runsText(p.original.runs) ||
      (Object.keys(p.rules) as Array<keyof ParagraphRules>).some(
        (k) => p.rules[k] !== p.original!.rules[k],
      ));

  // Soft → hard splits into multiple paragraphs
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
        isSelected={isSelected}
        hasChanges={hasChanges}
        onSelect={onSelect}
        styles={styles}
      >
        <p className="h-3" />
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
      isSelected={isSelected}
      hasChanges={hasChanges}
      onSelect={onSelect}
      styles={styles}
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
              className={cls}
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
                return (
                  <span
                    key={i}
                    className={cn(
                      cs?.bold && "font-bold",
                      cs?.italic && "italic",
                      cs?.underline && "underline",
                      cs?.smallCaps && "uppercase tracking-wide text-[0.85em]",
                    )}
                    style={
                      cs?.superscript
                        ? { verticalAlign: "super", fontSize: "0.75em" }
                        : cs?.subscript
                          ? { verticalAlign: "sub", fontSize: "0.75em" }
                          : undefined
                    }
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

function ParaShell({
  p,
  isSelected,
  hasChanges,
  onSelect,
  styles,
  children,
}: {
  p: ParagraphBlock;
  isSelected: boolean;
  hasChanges: boolean;
  onSelect: (id: string | null) => void;
  styles: StyleDef[];
  children: React.ReactNode;
}) {
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect(isSelected ? null : p.id);
      }}
      className={cn(
        "group relative -mx-3 cursor-pointer rounded px-3 transition",
        isSelected
          ? "bg-blue-50 ring-2 ring-blue-400"
          : hasChanges
            ? "bg-amber-50 hover:bg-amber-100/70"
            : "hover:bg-neutral-100/70",
      )}
    >
      {children}
      {isSelected && (
        <InlineEditor p={p} styles={styles} onClose={() => onSelect(null)} />
      )}
    </div>
  );
}

function InlineEditor({
  p,
  styles,
  onClose,
}: {
  p: ParagraphBlock;
  styles: StyleDef[];
  onClose: () => void;
}) {
  const setStyle = useEditor((s) => s.setStyle);
  const setText = useEditor((s) => s.setText);
  const updateParagraphRule = useEditor((s) => s.updateParagraphRule);
  const revertAll = useEditor((s) => s.revertParagraph);

  const [draft, setDraft] = useState(runsText(p.runs));

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="mt-2 mb-3 space-y-2 rounded-md border border-blue-300 bg-white p-3 text-[12px] text-neutral-800 shadow-sm"
    >
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={p.style}
          onChange={(e) => setStyle(p.id, e.target.value)}
          className="rounded border border-neutral-300 bg-white px-2 py-1 text-[11px] font-medium"
        >
          {styles.map((s) => (
            <option key={s.name} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap gap-1">
          {QUICK_RULES.map((r) => {
            const on = p.rules[r.key];
            return (
              <button
                key={r.key}
                onClick={() => updateParagraphRule(p.id, r.key, !on)}
                className={cn(
                  "rounded border px-1.5 py-0.5 text-[10px] transition",
                  on
                    ? "border-blue-500 bg-blue-500 text-white"
                    : "border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50",
                )}
              >
                {r.label}
              </button>
            );
          })}
        </div>
        <div className="ml-auto flex items-center gap-1">
          {p.original && (
            <button
              onClick={() => revertAll(p.id)}
              title="Revert this paragraph"
              className="inline-flex items-center gap-1 rounded border border-neutral-300 bg-white px-1.5 py-0.5 text-[10px] text-neutral-600 hover:bg-neutral-50"
            >
              <Undo2 className="h-3 w-3" /> Revert
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded border border-neutral-300 bg-white px-1.5 py-0.5 text-[10px] text-neutral-600 hover:bg-neutral-50"
          >
            Done
          </button>
        </div>
      </div>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft !== runsText(p.runs)) setText(p.id, draft);
        }}
        rows={Math.min(8, Math.max(2, draft.split("\n").length))}
        className="w-full resize-y rounded border border-neutral-300 bg-white px-2 py-1.5 font-sans text-[12px] leading-relaxed text-neutral-900 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-300"
      />
    </div>
  );
}
