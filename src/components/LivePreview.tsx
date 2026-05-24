import { useMemo, useState } from "react";
import { useEditor } from "@/store/editor";
import type {
  Block,
  ParagraphBlock,
  ParsedDoc,
  RunSpan,
  StyleDef,
  TableBlock,
} from "@/lib/types";
import { smartQuotes, trimTrailing, dashes, multiSpaces } from "@/lib/cleanup";
import { Eye, EyeOff, Tag, TagIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface LivePreviewProps {
  open: boolean;
  onToggle: () => void;
}

/** Stable, distinguishable color per style name. */
function styleColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 70% 45%)`;
}

const BODY_STYLES = new Set(["Body", "Normal", "Default Paragraph Font"]);

export function LivePreview({ open, onToggle }: LivePreviewProps) {
  const doc = useEditor((s) => s.doc);
  const [showMarkers, setShowMarkers] = useState(true);

  return (
    <aside
      className={cn(
        "relative flex h-full shrink-0 flex-col border-l border-border bg-muted/20 transition-all duration-300",
        open ? "w-[44%] min-w-[380px]" : "w-10",
      )}
    >
      <button
        onClick={onToggle}
        title={open ? "Hide live preview" : "Show live preview"}
        className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-border bg-background/60 px-3 text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        {open ? (
          <>
            <span className="flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" />
              Live preview
            </span>
            <EyeOff className="h-3.5 w-3.5" />
          </>
        ) : (
          <Eye className="mx-auto h-4 w-4" />
        )}
      </button>

      {open && (
        <>
          <div className="flex h-9 shrink-0 items-center justify-between gap-2 border-b border-border bg-background/40 px-3 text-[11px]">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Tag className="h-3 w-3" />
              Style markers
            </span>
            <label className="flex cursor-pointer items-center gap-1.5 text-muted-foreground hover:text-foreground">
              <input
                type="checkbox"
                checked={showMarkers}
                onChange={(e) => setShowMarkers(e.target.checked)}
                className="h-3 w-3 accent-primary"
              />
              {showMarkers ? "Visible" : "Hidden"}
            </label>
          </div>

          <div className="flex-1 overflow-y-auto bg-[hsl(220_14%_94%)] px-6 py-8">
            {doc ? (
              <div className="mx-auto w-full max-w-[640px] rounded-sm bg-white px-12 py-14 text-[13px] leading-[1.55] text-neutral-900 shadow-md">
                <DocPreview doc={doc} showMarkers={showMarkers} />
              </div>
            ) : (
              <p className="text-center text-xs text-muted-foreground">No document</p>
            )}
          </div>
        </>
      )}
    </aside>
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

  if (groups.length === 0) return <p className="h-3" />;

  const cls = cn(paragraphClasses(p), alignmentClass(p.alignment));

  const twipsToPx = (t: number) => (t / 1440) * 96;

  const leftIndent = p.leftIndent ?? 0;
  let firstLine = p.firstLineIndent ?? 0;
  if (p.rules.tabsToMargin && p.leadingTabs > 0) {
    firstLine = Math.max(firstLine, p.leadingTabs * 720);
  }

  const csMap = new Map(charStyles.map((c) => [c.name, c]));

  const paraIsStyled = showMarkers && !BODY_STYLES.has(p.style);
  const paraColor = paraIsStyled ? styleColor(p.style) : undefined;

  return (
    <>
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

        const content = (
          <>
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
                    "transition-colors",
                    cs?.bold && "font-bold",
                    cs?.italic && "italic",
                    cs?.underline && "underline",
                    cs?.smallCaps && "uppercase tracking-wide text-[0.85em]",
                    csColor && "cursor-help rounded-[2px] hover:bg-opacity-30",
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
          </>
        );

        return (
          <div
            key={idx}
            className={cn("group/para relative", paraIsStyled && "pl-3")}
            style={paraColor ? ({ "--style-color": paraColor } as React.CSSProperties) : undefined}
            title={paraIsStyled ? `Paragraph style: ${p.style}` : undefined}
          >
            {paraIsStyled && (
              <>
                <span
                  aria-hidden
                  className="pointer-events-none absolute left-0 top-1 bottom-1 w-[3px] rounded-full"
                  style={{ backgroundColor: paraColor }}
                />
                <span
                  className="pointer-events-none absolute -left-1 top-0 -translate-x-full whitespace-nowrap rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-white opacity-0 shadow-sm transition-opacity group-hover/para:opacity-100"
                  style={{ backgroundColor: paraColor }}
                >
                  <TagIcon className="mr-0.5 inline h-2.5 w-2.5" />
                  {p.style}
                </span>
              </>
            )}
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
              {content}
            </p>
          </div>
        );
      })}
    </>
  );
}
