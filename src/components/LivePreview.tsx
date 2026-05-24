import { useMemo } from "react";
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
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface LivePreviewProps {
  open: boolean;
  onToggle: () => void;
}

export function LivePreview({ open, onToggle }: LivePreviewProps) {
  const doc = useEditor((s) => s.doc);

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
        <div className="flex-1 overflow-y-auto bg-[hsl(220_14%_94%)] px-6 py-8">
          {doc ? (
            <div className="mx-auto w-full max-w-[640px] rounded-sm bg-white px-12 py-14 text-[13px] leading-[1.55] text-neutral-900 shadow-md">
              <DocPreview doc={doc} />
            </div>
          ) : (
            <p className="text-center text-xs text-muted-foreground">No document</p>
          )}
        </div>
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

function DocPreview({ doc }: { doc: ParsedDoc }) {
  const styleMap = useMemo(() => {
    const m = new Map<string, StyleDef>();
    for (const s of doc.paragraphStyles) m.set(s.name, s);
    return m;
  }, [doc.paragraphStyles]);

  return (
    <>
      {doc.blocks.map((b) => (
        <BlockView key={(b as { id: string }).id} block={b} styleMap={styleMap} charStyles={doc.charStyles} />
      ))}
    </>
  );
}

function BlockView({
  block,
  styleMap,
  charStyles,
}: {
  block: Block;
  styleMap: Map<string, StyleDef>;
  charStyles: ParsedDoc["charStyles"];
}) {
  if (block.kind === "paragraph") {
    return <ParaView p={block} styleMap={styleMap} charStyles={charStyles} />;
  }
  return <TableView t={block} styleMap={styleMap} charStyles={charStyles} />;
}

function TableView({
  t,
  styleMap,
  charStyles,
}: {
  t: TableBlock;
  styleMap: Map<string, StyleDef>;
  charStyles: ParsedDoc["charStyles"];
}) {
  return (
    <table className="my-3 w-full border-collapse text-[12px]">
      <tbody>
        {t.rows.map((row, ri) => (
          <tr key={ri}>
            {row.map((cell, ci) => (
              <td key={ci} className="border border-neutral-300 p-2 align-top">
                {cell.paragraphs.map((p) => (
                  <ParaView key={p.id} p={p} styleMap={styleMap} charStyles={charStyles} />
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
}: {
  p: ParagraphBlock;
  styleMap: Map<string, StyleDef>;
  charStyles: ParsedDoc["charStyles"];
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

  // Indent in pixels: 96dpi, 1440 twips = 1in = 96px
  const twipsToPx = (t: number) => (t / 1440) * 96;

  let leftIndent = p.leftIndent ?? 0;
  let firstLine = p.firstLineIndent ?? 0;
  if (p.rules.tabsToMargin && p.leadingTabs > 0) {
    firstLine = Math.max(firstLine, p.leadingTabs * 720);
  }

  const csMap = new Map(charStyles.map((c) => [c.name, c]));

  return (
    <>
      {groups.map((spans, idx) => {
        // Strip leading tabs when tabsToMargin and first group
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
              // visually expand remaining tabs as 4 spaces
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
                  style={cs?.superscript ? { verticalAlign: "super", fontSize: "0.75em" } : cs?.subscript ? { verticalAlign: "sub", fontSize: "0.75em" } : undefined}
                >
                  {text}
                </span>
              );
            })}
          </>
        );

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
              {content}
            </p>
          </div>
        );
      })}
    </>
  );
}
