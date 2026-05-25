import { useEffect, useMemo, useRef, useState } from "react";
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
import { Undo2, GitCompare } from "lucide-react";
import { cn } from "@/lib/utils";
import { detectIssues, ISSUE_COLOR, type Issue, type IssueKey } from "@/lib/issues";
import { ParagraphMinimap } from "./ParagraphMinimap";

const QUICK_RULES: Array<{ key: Exclude<keyof ParagraphRules, "multiSpaces">; label: string }> = [
  { key: "smartQuotes", label: "Smart quotes" },
  { key: "dashes", label: "Em dash" },
  { key: "trimTrailing", label: "Trim" },
  { key: "tabsToMargin", label: "Tabs→indent" },
  { key: "softToHard", label: "Soft→hard" },
  { key: "pageBreakBefore", label: "Break above" },
  { key: "pageBreakAfter", label: "Break below" },
];

export type PreviewFilter = "all" | "warnings" | "changed" | "selected" | "headings" | "unstyled";

const FILTER_LABELS: Array<{ key: PreviewFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "warnings", label: "Warnings" },
  { key: "changed", label: "Changed" },
  { key: "selected", label: "Selected" },
  { key: "headings", label: "Headings" },
  { key: "unstyled", label: "Unstyled" },
];

interface LivePreviewProps {
  selectedId: string | null;
  onSelect: (id: string | null, opts?: { shift?: boolean }) => void;
  filter: PreviewFilter;
  showHiddenChars: boolean;
}

export function LivePreview({ selectedId, onSelect, filter, showHiddenChars }: LivePreviewProps) {
  const doc = useEditor((s) => s.doc);
  const selection = useEditor((s) => s.selection);
  const [showMargins, setShowMargins] = useState(false);
  const [showNumbers, setShowNumbers] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const jump = (id: string) => {
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-para-id="${id}"]`) as HTMLElement | null;
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("diag-flash");
      window.setTimeout(() => el.classList.remove("diag-flash"), 1400);
    });
  };

  if (!doc) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No document
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <div
        ref={scrollRef}
        className="h-full overflow-y-auto bg-[hsl(220_14%_94%)] px-6 py-8"
      >
        <div className="mx-auto mb-3 flex w-full max-w-[760px] items-center justify-end gap-2">
          <button
            onClick={() => setShowNumbers((v) => !v)}
            className={cn(
              "rounded border px-2 py-1 text-[11px] font-medium transition",
              showNumbers
                ? "border-blue-500 bg-blue-500 text-white"
                : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50",
            )}
            title="Toggle paragraph numbers in the left gutter"
          >
            # Numbers
          </button>
          <button
            onClick={() => setShowMargins((v) => !v)}
            className={cn(
              "rounded border px-2 py-1 text-[11px] font-medium transition",
              showMargins
                ? "border-fuchsia-500 bg-fuchsia-500 text-white"
                : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50",
            )}
            title="Highlight paragraphs with left or first-line indents"
          >
            Margins
          </button>
        </div>
        <div className="mx-auto w-full max-w-[760px] rounded-sm bg-white px-14 py-16 text-[13px] leading-[1.55] text-neutral-900 shadow-md">
          <DocPreview
            doc={doc}
            selectedId={selectedId}
            onSelect={onSelect}
            showMargins={showMargins}
            showNumbers={showNumbers}
            filter={filter}
            selection={selection}
            paragraphIndex={paragraphIndexFor(doc.blocks)}
            showHiddenChars={showHiddenChars}
          />
        </div>
        <CharStyleFloatingToolbar doc={doc} />
      </div>
      <ParagraphMinimap blocks={doc.blocks} scrollRef={scrollRef} onJump={jump} />
    </div>
  );
}

function paragraphIndexFor(blocks: Block[]): Map<string, number> {
  const m = new Map<string, number>();
  let i = 0;
  for (const b of blocks) {
    if (b.kind === "paragraph") m.set(b.id, ++i);
    else
      for (const row of b.rows)
        for (const cell of row)
          for (const p of cell.paragraphs) m.set(p.id, ++i);
  }
  return m;
}

interface FloatingSel {
  x: number;
  y: number;
  paragraphId: string;
  start: number;
  end: number;
}

function getSrcOffset(node: Node, offset: number): { paragraphId: string; pos: number } | null {
  let span: HTMLElement | null = null;
  let n: Node | null = node;
  if (n.nodeType === Node.TEXT_NODE) n = n.parentElement;
  while (n && n instanceof HTMLElement) {
    if (n.dataset && n.dataset.srcStart !== undefined) {
      span = n;
      break;
    }
    n = n.parentElement;
  }
  if (!span) return null;
  const paraEl = span.closest("[data-para-id]") as HTMLElement | null;
  if (!paraEl) return null;
  const srcStart = Number(span.dataset.srcStart);
  const srcLen = Number(span.dataset.srcLen);
  let localOffset = offset;
  if (node.nodeType !== Node.TEXT_NODE) {
    const text = span.textContent ?? "";
    localOffset = Math.min(offset, text.length);
  }
  const pos = srcStart + Math.max(0, Math.min(localOffset, srcLen));
  return { paragraphId: paraEl.dataset.paraId!, pos };
}

function CharStyleFloatingToolbar({ doc }: { doc: ParsedDoc }) {
  const applyCharStyleRange = useEditor((s) => s.applyCharStyleRange);
  const [sel, setSel] = useState<FloatingSel | null>(null);

  useEffect(() => {
    const onSelChange = () => {
      const s = window.getSelection();
      if (!s || s.isCollapsed || s.rangeCount === 0) {
        setSel(null);
        return;
      }
      const range = s.getRangeAt(0);
      const a = getSrcOffset(range.startContainer, range.startOffset);
      const b = getSrcOffset(range.endContainer, range.endOffset);
      if (!a || !b || a.paragraphId !== b.paragraphId) {
        setSel(null);
        return;
      }
      const start = Math.min(a.pos, b.pos);
      const end = Math.max(a.pos, b.pos);
      if (end <= start) {
        setSel(null);
        return;
      }
      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        setSel(null);
        return;
      }
      setSel({
        x: rect.left + rect.width / 2,
        y: rect.top,
        paragraphId: a.paragraphId,
        start,
        end,
      });
    };
    document.addEventListener("selectionchange", onSelChange);
    return () => document.removeEventListener("selectionchange", onSelChange);
  }, []);

  if (!sel) return null;

  const apply = (name: string | null) => {
    applyCharStyleRange(sel.paragraphId, sel.start, sel.end, name);
    window.getSelection()?.removeAllRanges();
    setSel(null);
  };

  return (
    <div
      onMouseDown={(e) => e.preventDefault()}
      style={{
        position: "fixed",
        left: Math.max(8, Math.min(window.innerWidth - 8, sel.x)),
        top: Math.max(8, sel.y - 8),
        transform: "translate(-50%, -100%)",
        zIndex: 60,
      }}
      className="flex max-w-[90vw] flex-wrap items-center gap-1 rounded-md border border-neutral-300 bg-white px-1.5 py-1 text-[11px] shadow-lg"
    >
      <span className="px-1 text-[10px] uppercase tracking-wide text-neutral-500">Apply</span>
      {doc.charStyles.length === 0 && (
        <span className="px-1 text-neutral-400 italic">No styles defined</span>
      )}
      {doc.charStyles.map((c) => (
        <button
          key={c.name}
          onClick={() => apply(c.name)}
          title={c.name}
          className={cn(
            "rounded border border-neutral-200 bg-white px-1.5 py-0.5 hover:bg-neutral-100",
            c.bold && "font-bold",
            c.italic && "italic",
            c.underline && "underline",
          )}
        >
          {c.name}
        </button>
      ))}
      <button
        onClick={() => apply(null)}
        className="ml-1 rounded border border-neutral-300 bg-neutral-50 px-1.5 py-0.5 text-neutral-600 hover:bg-neutral-100"
        title="Remove character style"
      >
        Clear
      </button>
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

interface DocPreviewExtras {
  showNumbers: boolean;
  filter: PreviewFilter;
  selection: Set<string>;
  paragraphIndex: Map<string, number>;
  showHiddenChars: boolean;
}

function DocPreview({
  doc,
  selectedId,
  onSelect,
  showMargins,
  showNumbers,
  filter,
  selection,
  paragraphIndex,
}: {
  doc: ParsedDoc;
  selectedId: string | null;
  onSelect: LivePreviewProps["onSelect"];
  showMargins: boolean;
} & DocPreviewExtras) {
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
          showMargins={showMargins}
          showNumbers={showNumbers}
          filter={filter}
          selection={selection}
          paragraphIndex={paragraphIndex}
        />
      ))}
    </>
  );
}

interface BlockViewProps extends DocPreviewExtras {
  block: Block;
  styleMap: Map<string, StyleDef>;
  charStyles: ParsedDoc["charStyles"];
  selectedId: string | null;
  onSelect: LivePreviewProps["onSelect"];
  styles: StyleDef[];
  showMargins: boolean;
  showHiddenChars: boolean;
}

function BlockView(props: BlockViewProps) {
  if (props.block.kind === "paragraph") return <ParaView {...props} p={props.block} />;
  return <TableView {...props} t={props.block} />;
}

function TableView({
  t,
  ...rest
}: BlockViewProps & { t: TableBlock }) {
  return (
    <table className="my-3 w-full border-collapse text-[12px]">
      <tbody>
        {t.rows.map((row, ri) => (
          <tr key={ri}>
            {row.map((cell, ci) => (
              <td key={ci} className="border border-neutral-300 p-2 align-top">
                {cell.paragraphs.map((p) => (
                  <ParaView key={p.id} {...rest} block={p} p={p} />
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
  showMargins,
  showNumbers,
  filter,
  selection,
  paragraphIndex,
  showHiddenChars,
}: BlockViewProps & { p: ParagraphBlock }) {
  const isSelected = selectedId === p.id;
  const isInSelection = selection.has(p.id);
  const hasChanges =
    !!p.original &&
    (p.style !== p.original.style ||
      runsText(p.runs) !== runsText(p.original.runs) ||
      (Object.keys(p.rules) as Array<keyof ParagraphRules>).some(
        (k) => p.rules[k] !== p.original!.rules[k],
      ));
  const issues = useMemo(() => detectIssues(p), [p]);
  const matchesFilter = useMemo(() => {
    switch (filter) {
      case "all":
        return true;
      case "warnings":
        return issues.length > 0;
      case "changed":
        return hasChanges;
      case "selected":
        return isInSelection;
      case "headings":
        return /^Heading/i.test(p.style);
      case "unstyled":
        return !p.sourceStyle;
    }
  }, [filter, issues.length, hasChanges, isInSelection, p.style, p.sourceStyle]);

  type Item = { run: RunSpan; srcIdx: number; srcStart: number; stripLen: number };
  const items: Item[] = [];
  {
    let off = 0;
    for (let i = 0; i < p.runs.length; i++) {
      const r = p.runs[i];
      items.push({ run: r, srcIdx: i, srcStart: off, stripLen: 0 });
      off += r.text.length;
    }
  }
  const groupsSrc: Item[][] = [];
  if (p.rules.softToHard) {
    let cur: Item[] = [];
    for (const it of items) {
      if (it.run.text === "\n") {
        if (cur.length) groupsSrc.push(cur);
        cur = [];
      } else cur.push(it);
    }
    if (cur.length) groupsSrc.push(cur);
  } else {
    groupsSrc.push(items);
  }

  const shellProps = {
    p,
    isSelected,
    isInSelection,
    hasChanges,
    onSelect,
    styles,
    showMargins,
    showNumbers,
    issues,
    matchesFilter,
    paragraphIndex,
  };

  if (groupsSrc.length === 0) {
    return (
      <ParaShell {...shellProps}>
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
    <ParaShell {...shellProps}>
      {groupsSrc.map((spans, idx) => {
        let working = spans;
        if (p.rules.tabsToMargin && idx === 0 && working.length) {
          const first = working[0];
          const m = first.run.text.match(/^\t+/);
          if (m) {
            const strip = m[0].length;
            const newRun = { ...first.run, text: first.run.text.slice(strip) };
            const newItem: Item = {
              run: newRun,
              srcIdx: first.srcIdx,
              srcStart: first.srcStart + strip,
              stripLen: strip,
            };
            working = [newItem, ...working.slice(1)];
            if (!newRun.text) working.shift();
          }
        }
        const isPageBreak = idx === 0 && p.rules.pageBreakBefore;

        return (
          <div key={idx}>
            {isPageBreak && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  useEditor.getState().updateParagraphRule(p.id, "pageBreakBefore", false);
                }}
                title="Click to remove page break"
                className="my-4 flex w-full items-center gap-2 border-t border-dashed border-neutral-400 pt-1 text-center text-[9px] uppercase tracking-widest text-neutral-500 hover:text-red-600 hover:border-red-400"
              >
                <span className="flex-1 border-t border-dashed border-neutral-300" />
                <span>Page break ✕</span>
                <span className="flex-1 border-t border-dashed border-neutral-300" />
              </button>
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
              {working.map((it, i) => {
                const r = it.run;
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
                const flags = cs
                  ? [
                      cs.bold && "Bold",
                      cs.italic && "Italic",
                      cs.underline && "Underline",
                      cs.smallCaps && "Small caps",
                      cs.superscript && "Superscript",
                      cs.subscript && "Subscript",
                    ].filter(Boolean)
                  : [];
                const tip = cs
                  ? `${cs.name}${flags.length ? ` — ${flags.join(", ")}` : ""}`
                  : r.charStyle
                    ? r.charStyle
                    : "Default";
                return (
                  <span
                    key={i}
                    title={tip}
                    data-src-start={it.srcStart}
                    data-src-len={r.text.length}
                    className={cn(
                      cs?.bold && "font-bold",
                      cs?.italic && "italic",
                      cs?.underline && "underline",
                      cs?.smallCaps && "uppercase tracking-wide text-[0.85em]",
                      cs && "hover:bg-amber-100/60 hover:outline hover:outline-1 hover:outline-amber-300 rounded-sm",
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
  isInSelection,
  hasChanges,
  onSelect,
  styles,
  showMargins,
  showNumbers,
  issues,
  matchesFilter,
  paragraphIndex,
  children,
}: {
  p: ParagraphBlock;
  isSelected: boolean;
  isInSelection: boolean;
  hasChanges: boolean;
  onSelect: LivePreviewProps["onSelect"];
  styles: StyleDef[];
  showMargins: boolean;
  showNumbers: boolean;
  issues: Issue[];
  matchesFilter: boolean;
  paragraphIndex: Map<string, number>;
  children: React.ReactNode;
}) {
  const updateParagraphRule = useEditor((s) => s.updateParagraphRule);
  const toggleSelect = useEditor((s) => s.toggleSelect);
  const rangeSelect = useEditor((s) => s.rangeSelect);
  const twipsToPx = (t: number) => (t / 1440) * 96;
  const leftIndent = p.leftIndent ?? 0;
  let firstLine = p.firstLineIndent ?? 0;
  if (p.rules.tabsToMargin && p.leadingTabs > 0) {
    firstLine = Math.max(firstLine, p.leadingTabs * 720);
  }
  const hasMargin = showMargins && (leftIndent !== 0 || firstLine !== 0);
  const fmt = (t: number) => `${(t / 1440).toFixed(2)}″`;
  const idx = paragraphIndex.get(p.id);

  return (
    <div
      data-para-id={p.id}
      onClick={(e) => {
        e.stopPropagation();
        if (e.metaKey || e.ctrlKey) {
          toggleSelect(p.id);
          return;
        }
        if (e.shiftKey) {
          rangeSelect(p.id);
          return;
        }
        onSelect(isSelected ? null : p.id);
      }}
      style={{
        marginTop: p.spaceBefore ? twipsToPx(p.spaceBefore) : undefined,
        marginBottom: p.spaceAfter ? twipsToPx(p.spaceAfter) : undefined,
      }}
      className={cn(
        "group relative -mx-3 cursor-pointer rounded px-3 transition",
        isSelected
          ? "bg-blue-50 ring-2 ring-blue-400"
          : isInSelection
            ? "bg-blue-50/40 ring-1 ring-blue-300"
            : hasChanges
              ? "bg-amber-50 hover:bg-amber-100/70"
              : "hover:bg-neutral-100/70",
        hasMargin && !isSelected && "bg-fuchsia-50/60",
        !matchesFilter && "opacity-25",
      )}
    >
      {showNumbers && idx !== undefined && (
        <span
          className="pointer-events-none absolute -left-9 top-1 select-none font-mono text-[10px] text-neutral-400"
          aria-hidden
        >
          {idx}
        </span>
      )}
      {issues.length > 0 && (
        <div className="pointer-events-none absolute left-0 top-1 hidden -translate-x-full pr-1 group-hover:flex">
          <div className="flex flex-col gap-0.5">
            {issues.slice(0, 3).map((iss) => (
              <span
                key={iss.key}
                className={cn("h-1.5 w-1.5 rounded-full", ISSUE_COLOR[iss.key as IssueKey])}
                title={iss.label}
              />
            ))}
          </div>
        </div>
      )}
      {!p.rules.pageBreakBefore && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            updateParagraphRule(p.id, "pageBreakBefore", true);
          }}
          title="Insert page break before this paragraph"
          className="absolute -top-2 left-1/2 z-10 hidden -translate-x-1/2 items-center gap-1 rounded-full border border-neutral-300 bg-white px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-neutral-600 shadow-sm hover:border-blue-400 hover:text-blue-600 group-hover:inline-flex"
        >
          + Break above
        </button>
      )}
      {!p.rules.pageBreakAfter && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            updateParagraphRule(p.id, "pageBreakAfter", true);
          }}
          title="Insert page break after this paragraph"
          className="absolute -bottom-2 left-1/2 z-10 hidden -translate-x-1/2 items-center gap-1 rounded-full border border-neutral-300 bg-white px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-neutral-600 shadow-sm hover:border-blue-400 hover:text-blue-600 group-hover:inline-flex"
        >
          + Break below
        </button>
      )}
      {hasMargin && (
        <>
          {leftIndent !== 0 && (
            <div
              className="pointer-events-none absolute top-0 bottom-0 border-l-2 border-dashed border-fuchsia-400"
              style={{ left: `calc(0.75rem + ${twipsToPx(leftIndent)}px)` }}
              title={`Left indent: ${fmt(leftIndent)}`}
            />
          )}
          {firstLine !== 0 && (
            <div
              className="pointer-events-none absolute top-0 h-3 border-l-2 border-dotted border-fuchsia-500"
              style={{
                left: `calc(0.75rem + ${twipsToPx(leftIndent + firstLine)}px)`,
              }}
              title={`First-line indent: ${fmt(firstLine)}`}
            />
          )}
          <span className="pointer-events-none absolute -top-0.5 right-1 rounded bg-fuchsia-500 px-1 py-px text-[9px] font-medium text-white">
            {leftIndent !== 0 && `L ${fmt(leftIndent)}`}
            {leftIndent !== 0 && firstLine !== 0 && " · "}
            {firstLine !== 0 && `1st ${fmt(firstLine)}`}
          </span>
        </>
      )}
      {children}
      {issues.length > 0 && !isSelected && (
        <div className="mt-1 flex flex-wrap items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {issues.map((iss) => (
            <button
              key={iss.key}
              onClick={(e) => {
                e.stopPropagation();
                if (iss.rule) updateParagraphRule(p.id, iss.rule.key, iss.rule.value);
              }}
              disabled={!iss.rule}
              title={iss.rule ? `Fix: ${iss.fix}` : iss.label}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider",
                iss.rule
                  ? "cursor-pointer border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100"
                  : "border-neutral-300 bg-neutral-50 text-neutral-500",
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", ISSUE_COLOR[iss.key as IssueKey])} />
              {iss.label}
              {iss.fix && <span className="opacity-70">· {iss.fix}</span>}
            </button>
          ))}
        </div>
      )}
      {p.rules.pageBreakAfter && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            updateParagraphRule(p.id, "pageBreakAfter", false);
          }}
          title="Click to remove page break"
          className="my-4 flex w-full items-center gap-2 border-b border-dashed border-neutral-400 pb-1 text-center text-[9px] uppercase tracking-widest text-neutral-500 hover:text-red-600 hover:border-red-400"
        >
          <span className="flex-1 border-t border-dashed border-neutral-300" />
          <span>Page break ✕</span>
          <span className="flex-1 border-t border-dashed border-neutral-300" />
        </button>
      )}
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
  const updateParagraph = useEditor((s) => s.updateParagraph);
  const updateParagraphRule = useEditor((s) => s.updateParagraphRule);
  const revertAll = useEditor((s) => s.revertParagraph);

  const spaceBeforePt = p.spaceBefore ? p.spaceBefore / 20 : 0;
  const spaceAfterPt = p.spaceAfter ? p.spaceAfter / 20 : 0;

  const [draft, setDraft] = useState(runsText(p.runs));
  const [showDiff, setShowDiff] = useState(false);

  const orig = p.original;
  const origText = orig ? runsText(orig.runs) : null;
  const currentText = runsText(p.runs);
  const hasTextChange = origText !== null && origText !== currentText;

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
          {orig && (
            <button
              onClick={() => setShowDiff((v) => !v)}
              title="Compare with original parsed text"
              className={cn(
                "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px]",
                showDiff
                  ? "border-blue-500 bg-blue-500 text-white"
                  : "border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50",
              )}
            >
              <GitCompare className="h-3 w-3" /> Compare
            </button>
          )}
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
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-neutral-600">
        <label className="flex items-center gap-1.5" title="Extra space above this paragraph, in points (default 0)">
          <span>Space before</span>
          <input
            type="number"
            min={0}
            step={1}
            value={spaceBeforePt}
            onChange={(e) => {
              const pt = Math.max(0, Number(e.target.value) || 0);
              updateParagraph(p.id, { spaceBefore: pt ? pt * 20 : undefined });
            }}
            className="w-14 rounded border border-neutral-300 bg-white px-1.5 py-0.5 text-right text-[11px] outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-300"
          />
          <span className="text-neutral-400">pt</span>
        </label>
        <label className="flex items-center gap-1.5" title="Extra space below this paragraph, in points (default 0)">
          <span>Space after</span>
          <input
            type="number"
            min={0}
            step={1}
            value={spaceAfterPt}
            onChange={(e) => {
              const pt = Math.max(0, Number(e.target.value) || 0);
              updateParagraph(p.id, { spaceAfter: pt ? pt * 20 : undefined });
            }}
            className="w-14 rounded border border-neutral-300 bg-white px-1.5 py-0.5 text-right text-[11px] outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-300"
          />
          <span className="text-neutral-400">pt</span>
        </label>
        {(p.spaceBefore || p.spaceAfter) && (
          <button
            onClick={() => updateParagraph(p.id, { spaceBefore: undefined, spaceAfter: undefined })}
            className="ml-auto rounded border border-neutral-300 bg-white px-1.5 py-0.5 text-[10px] text-neutral-600 hover:bg-neutral-50"
          >
            Reset spacing
          </button>
        )}
      </div>
      {showDiff && orig && (
        <div className="grid grid-cols-2 gap-2 rounded border border-neutral-200 bg-neutral-50 p-2 text-[11px]">
          <div>
            <div className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-neutral-500">
              Original ({orig.style})
            </div>
            <div
              className={cn(
                "whitespace-pre-wrap rounded bg-white px-2 py-1 leading-relaxed text-neutral-700",
                hasTextChange && "border border-rose-200",
              )}
            >
              {origText || <span className="italic text-neutral-400">(empty)</span>}
            </div>
          </div>
          <div>
            <div className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-neutral-500">
              Current ({p.style})
            </div>
            <div
              className={cn(
                "whitespace-pre-wrap rounded bg-white px-2 py-1 leading-relaxed text-neutral-900",
                hasTextChange && "border border-emerald-200",
              )}
            >
              {currentText || <span className="italic text-neutral-400">(empty)</span>}
            </div>
          </div>
        </div>
      )}
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
