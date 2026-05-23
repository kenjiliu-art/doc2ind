import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  PageBreak,
  Table,
  TableRow,
  TableCell,
  WidthType,
  type IRunOptions,
  type IParagraphOptions,
} from "docx";
import type {
  Block,
  CharStyleDef,
  ParagraphBlock,
  ParsedDoc,
  RunSpan,
  StyleDef,
} from "./types";
import { smartQuotes, trimTrailing } from "./cleanup";

function styleIdFor(name: string): string {
  return name.replace(/[^A-Za-z0-9]/g, "");
}

function applyCleanup(text: string, p: ParagraphBlock): string {
  let s = text;
  if (p.rules.smartQuotes) s = smartQuotes(s);
  if (p.rules.trimTrailing) s = trimTrailing(s);
  return s;
}

function runsToDocxRuns(
  spans: RunSpan[],
  p: ParagraphBlock,
  charStyles: CharStyleDef[],
): TextRun[] {
  const csMap = new Map(charStyles.map((c) => [c.name, c]));
  const out: TextRun[] = [];
  for (const s of spans) {
    if (s.text === "\n") {
      // soft break inside paragraph - only kept if user did NOT enable softToHard
      out.push(new TextRun({ text: "", break: 1 }));
      continue;
    }
    const cs = s.charStyle ? csMap.get(s.charStyle) : undefined;
    const opts: IRunOptions = {
      text: applyCleanup(s.text, p),
      ...(cs?.bold ? { bold: true } : {}),
      ...(cs?.italic ? { italics: true } : {}),
      ...(cs?.underline ? { underline: {} } : {}),
      ...(cs?.superscript ? { superScript: true } : {}),
      ...(cs?.subscript ? { subScript: true } : {}),
      ...(cs?.smallCaps ? { smallCaps: true } : {}),
    };
    out.push(new TextRun(opts));
  }
  return out;
}

function styleNameToHeading(name: string): (typeof HeadingLevel)[keyof typeof HeadingLevel] | undefined {
  if (name === "Heading 1") return HeadingLevel.HEADING_1;
  if (name === "Heading 2") return HeadingLevel.HEADING_2;
  if (name === "Heading 3") return HeadingLevel.HEADING_3;
  return undefined;
}

function paragraphToDocx(
  p: ParagraphBlock,
  charStyles: CharStyleDef[],
): Paragraph[] {
  if (p.runs.length === 0) {
    return [new Paragraph({ children: [] })];
  }

  // Split on soft breaks if user wants soft->hard
  let groups: RunSpan[][];
  if (p.rules.softToHard) {
    groups = [[]];
    for (const r of p.runs) {
      if (r.text === "\n") groups.push([]);
      else groups[groups.length - 1].push(r);
    }
    groups = groups.filter((g) => g.length > 0);
  } else {
    groups = [p.runs];
  }

  // Compute indent
  let leftIndent = p.leftIndent ?? 0;
  let firstLine = p.firstLineIndent ?? 0;
  if (p.rules.tabsToMargin) {
    if (p.leadingTabs > 0) {
      // 1 tab ~ 0.5" = 720 twips
      firstLine = Math.max(firstLine, p.leadingTabs * 720);
    }
  }

  const alignmentMap = {
    left: AlignmentType.LEFT,
    center: AlignmentType.CENTER,
    right: AlignmentType.RIGHT,
    justify: AlignmentType.JUSTIFIED,
  } as const;

  const out: Paragraph[] = [];
  groups.forEach((group, idx) => {
    // Strip leading tabs if tabsToMargin
    let spans = group;
    if (p.rules.tabsToMargin && idx === 0) {
      spans = [...group];
      while (spans.length && spans[0].text.startsWith("\t")) {
        spans[0] = { ...spans[0], text: spans[0].text.replace(/^\t+/, "") };
        if (!spans[0].text) spans.shift();
        else break;
      }
    }

    const opts: IParagraphOptions = {
      children: runsToDocxRuns(spans, p, charStyles),
      style: styleNameToHeading(p.style) ? undefined : styleIdFor(p.style),
      heading: styleNameToHeading(p.style),
      pageBreakBefore: idx === 0 && p.rules.pageBreakBefore,
      keepNext: p.rules.keepWithNext,
      alignment: p.alignment ? alignmentMap[p.alignment] : undefined,
      ...(leftIndent || firstLine
        ? {
            indent: {
              left: leftIndent || undefined,
              firstLine: firstLine || undefined,
            },
          }
        : {}),
    };
    out.push(new Paragraph(opts));
  });
  return out;
}

export async function buildDocx(doc: ParsedDoc): Promise<Blob> {
  const styles = {
    paragraphStyles: doc.paragraphStyles.map((s: StyleDef) => ({
      id: styleIdFor(s.name),
      name: s.name,
      basedOn: "Normal",
      next: "Normal",
      quickFormat: true,
      run: {
        font: s.font,
        size: s.size,
        bold: s.bold,
        italics: s.italic,
      },
      paragraph: {
        spacing: {
          before: s.spaceBefore,
          after: s.spaceAfter,
          line: s.lineSpacing,
        },
        indent:
          s.leftIndent || s.firstLineIndent
            ? { left: s.leftIndent, firstLine: s.firstLineIndent }
            : undefined,
        keepNext: s.keepWithNext,
      },
    })),
  };

  const children: (Paragraph | Table)[] = [];
  for (const block of doc.blocks) {
    if (block.kind === "paragraph") {
      children.push(...paragraphToDocx(block, doc.charStyles));
    } else if (block.kind === "table") {
      children.push(
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          rows: block.rows.map(
            (row) =>
              new TableRow({
                children: row.map(
                  (cell) =>
                    new TableCell({
                      children:
                        cell.paragraphs.length > 0
                          ? cell.paragraphs.flatMap((cp) =>
                              paragraphToDocx(cp, doc.charStyles),
                            )
                          : [new Paragraph({ children: [] })],
                    }),
                ),
              }),
          ),
        }),
      );
    }
  }

  const document = new Document({
    styles,
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children,
      },
    ],
  });

  return await Packer.toBlob(document);
}
