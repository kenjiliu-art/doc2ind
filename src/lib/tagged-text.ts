import type { Block, ParagraphBlock, ParsedDoc, RunSpan, StyleDef, CharStyleDef } from "./types";
import { smartQuotes, trimTrailing, dashes, multiSpaces } from "./cleanup";

function escapeTagged(text: string): string {
  // InDesign Tagged Text uses < and > for tags; escape them in content
  return text.replace(/</g, "<0x003C>").replace(/>/g, "<0x003E>");
}

function styleDecl(s: StyleDef): string {
  const props: string[] = [];
  if (s.font) props.push(`<cFont:${s.font}>`);
  if (s.size) props.push(`<cSize:${s.size / 2}>`);
  if (s.bold) props.push(`<cTypeface:Bold>`);
  if (s.italic) props.push(`<cTypeface:Italic>`);
  if (s.alignment) {
    const m = { left: "Left", center: "Center", right: "Right", justify: "LeftJustified" } as const;
    props.push(`<pAlignment:${m[s.alignment]}>`);
  }
  if (s.spaceBefore) props.push(`<pSpaceBefore:${(s.spaceBefore / 1440).toFixed(3)}>`);
  if (s.spaceAfter) props.push(`<pSpaceAfter:${(s.spaceAfter / 1440).toFixed(3)}>`);
  if (s.leftIndent) props.push(`<pLeftIndent:${(s.leftIndent / 1440).toFixed(3)}>`);
  if (s.firstLineIndent) props.push(`<pFirstLineIndent:${(s.firstLineIndent / 1440).toFixed(3)}>`);
  props.push(`<pHyphenation:${s.hyphenation ? 1 : 0}>`);
  if (s.keepWithNext) props.push(`<pKeepWithNext:1>`);
  return `<DefineParaStyle:${s.name}=${props.join("")}>`;
}

function charStyleDecl(c: CharStyleDef): string {
  const props: string[] = [];
  if (c.bold) props.push(`<cTypeface:Bold>`);
  if (c.italic) props.push(`<cTypeface:Italic>`);
  if (c.bold && c.italic) props.push(`<cTypeface:Bold Italic>`);
  if (c.underline) props.push(`<cUnderline:1>`);
  if (c.superscript) props.push(`<cPosition:Superscript>`);
  if (c.subscript) props.push(`<cPosition:Subscript>`);
  if (c.smallCaps) props.push(`<cCase:SmallCaps>`);
  return `<DefineCharStyle:${c.name}=${props.join("")}>`;
}

function applyCleanup(text: string, p: ParagraphBlock): string {
  let s = text;
  if (p.rules.smartQuotes) s = smartQuotes(s);
  if (p.rules.dashes) s = dashes(s);
  if (p.rules.multiSpaces !== "none") s = multiSpaces(s, p.rules.multiSpaces);
  if (p.rules.trimTrailing) s = trimTrailing(s);
  return s;
}

function runsToTagged(
  spans: RunSpan[],
  p: ParagraphBlock,
  footnoteMap: Map<number, ParagraphBlock[]>,
): string {
  let out = "";
  for (const s of spans) {
    if (s.footnoteRef !== undefined) {
      const fnPars = footnoteMap.get(s.footnoteRef);
      if (fnPars && fnPars.length) {
        const inner = fnPars
          .map((fp) => runsToTagged(fp.runs, fp, footnoteMap))
          .join(" ");
        out += `<FootnoteStart:>${inner}<FootnoteEnd:>`;
      }
      continue;
    }
    if (s.text === "\n") {
      // soft return rendered if not converted to hard
      if (!p.rules.softToHard) out += "<0x000A>";
      continue;
    }
    if (!s.text) continue;
    const cleaned = escapeTagged(applyCleanup(s.text, p));
    if (s.charStyle) {
      out += `<CharStyle:${s.charStyle}>${cleaned}<CharStyle:>`;
    } else {
      out += cleaned;
    }
  }
  return out;
}

function paragraphToTagged(p: ParagraphBlock, footnoteMap: Map<number, ParagraphBlock[]>, listCounter: { n: number }): string {
  if (p.runs.length === 0) return `<ParaStyle:${p.style}>\r\n`;

  // Strip leading tabs if tabsToMargin
  let spans = p.runs;
  if (p.rules.tabsToMargin && spans.length) {
    spans = [...spans];
    while (spans.length && spans[0].text.startsWith("\t")) {
      spans[0] = { ...spans[0], text: spans[0].text.replace(/^\t+/, "") };
      if (!spans[0].text) spans.shift();
      else break;
    }
  }

  // Prepend list bullet/number
  let listPrefix = "";
  if (p.listKind === "bullet") {
    listPrefix = "\u2022\t";
  } else if (p.listKind === "number") {
    listCounter.n += 1;
    listPrefix = `${listCounter.n}.\t`;
  } else {
    listCounter.n = 0;
  }

  if (p.rules.softToHard) {
    // Split into separate paragraphs
    const groups: RunSpan[][] = [[]];
    for (const r of spans) {
      if (r.text === "\n") groups.push([]);
      else groups[groups.length - 1].push(r);
    }
    const filtered = groups.filter((g) => g.length > 0);
    return filtered
      .map((g, i) => {
        const prefix = i === 0 && p.rules.pageBreakBefore ? "<pBreakBefore:Page>" : "";
        const list = i === 0 ? listPrefix : "";
        return `<ParaStyle:${p.style}>${prefix}${list}${runsToTagged(g, p, footnoteMap)}\r\n`;
      })
      .join("");
  }

  const prefix = p.rules.pageBreakBefore ? "<pBreakBefore:Page>" : "";
  return `<ParaStyle:${p.style}>${prefix}${listPrefix}${runsToTagged(spans, p, footnoteMap)}\r\n`;
}

export function buildTaggedText(doc: ParsedDoc): string {
  const header = `<ASCII-WIN>\r\n<Version:6><FeatureSet:InDesign-Roman>\r\n`;
  const usedParaStyles = new Set(
    doc.blocks
      .flatMap((b) =>
        b.kind === "paragraph"
          ? [b.style]
          : b.rows.flatMap((r) => r.flatMap((c) => c.paragraphs.map((p) => p.style))),
      ),
  );
  const usedChar = new Set<string>();
  doc.blocks.forEach((b) => {
    if (b.kind === "paragraph") {
      b.runs.forEach((r) => r.charStyle && usedChar.add(r.charStyle));
    } else {
      b.rows.forEach((row) =>
        row.forEach((c) =>
          c.paragraphs.forEach((p) =>
            p.runs.forEach((r) => r.charStyle && usedChar.add(r.charStyle)),
          ),
        ),
      );
    }
  });

  const paraDecls = doc.paragraphStyles
    .filter((s) => usedParaStyles.has(s.name))
    .map(styleDecl)
    .join("\r\n");
  const charDecls = doc.charStyles
    .filter((c) => usedChar.has(c.name))
    .map(charStyleDecl)
    .join("\r\n");

  const footnoteMap = new Map<number, ParagraphBlock[]>();
  for (const fn of doc.footnotes) footnoteMap.set(fn.id, fn.paragraphs);
  const listCounter = { n: 0 };

  let body = "";
  for (const block of doc.blocks) {
    if (block.kind === "paragraph") {
      body += paragraphToTagged(block, footnoteMap, listCounter);
    } else {
      // InDesign Tagged Text table
      const rows = block.rows.length;
      const cols = block.rows[0]?.length ?? 0;
      body += `<TableStart:${rows},${cols}:1:0<tCellDefaultCellType:Text>>`;
      for (const row of block.rows) {
        body += `<RowStart:>`;
        for (const cell of row) {
          body += `<CellStart:1,1>`;
          for (const cp of cell.paragraphs) {
            body += paragraphToTagged(cp, footnoteMap, listCounter);
          }
          body += `<CellEnd:>`;
        }
        body += `<RowEnd:>`;
      }
      body += `<TableEnd:>\r\n`;
    }
  }

  return `${header}${paraDecls}\r\n${charDecls}\r\n${body}`;
}
