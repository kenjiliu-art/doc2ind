import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import type {
  Block,
  CharStyleDef,
  CharStyleName,
  ParagraphBlock,
  ParagraphRules,
  ParsedDoc,
  RunSpan,
  StyleDef,
  TableBlock,
  TableCellData,
} from "./types";
import { detectParagraphStyle, defaultRulesFor } from "./detect";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  preserveOrder: true,
  trimValues: false,
  parseTagValue: false,
});

let idCounter = 0;
const nextId = () => `b${++idCounter}`;
const fontCounts = new Map<string, number>();

type Node = Record<string, unknown> & { ":@"?: Record<string, string> };

function getChildren(node: Node, tag: string): Node[] {
  const out: Node[] = [];
  for (const key of Object.keys(node)) {
    if (key === ":@") continue;
    const arr = (node as Record<string, unknown>)[key];
    if (key === tag && Array.isArray(arr)) {
      for (const v of arr) if (v && typeof v === "object") out.push(v as Node);
    }
  }
  return out;
}

// preserveOrder gives an array of {tag: [...children], ":@": {...attrs}}
function walkOrdered(arr: unknown[], tag: string): { node: Node; attrs: Record<string, string> }[] {
  const out: { node: Node; attrs: Record<string, string> }[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    for (const key of Object.keys(obj)) {
      if (key === ":@") continue;
      if (key === tag) {
        const children = obj[key];
        const attrs = (obj[":@"] as Record<string, string>) ?? {};
        out.push({
          node: { [key]: children } as Node,
          attrs,
        });
      }
    }
  }
  return out;
}

function getOrderedChildren(parent: unknown): unknown[] {
  if (!parent || typeof parent !== "object") return [];
  const obj = parent as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (key === ":@") continue;
    const v = obj[key];
    if (Array.isArray(v)) return v;
  }
  return [];
}

function findTagChildren(item: unknown, tag: string): unknown[] {
  if (!item || typeof item !== "object") return [];
  const obj = item as Record<string, unknown>;
  const v = obj[tag];
  return Array.isArray(v) ? v : [];
}

function getAttr(item: unknown): Record<string, string> {
  if (!item || typeof item !== "object") return {};
  const obj = item as Record<string, unknown>;
  return (obj[":@"] as Record<string, string>) ?? {};
}

function tagOf(item: unknown): string | null {
  if (!item || typeof item !== "object") return null;
  for (const key of Object.keys(item as Record<string, unknown>)) {
    if (key !== ":@") return key;
  }
  return null;
}

interface RunInfo {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  superscript: boolean;
  subscript: boolean;
  smallCaps: boolean;
  hasBreak: boolean;
  fontSize?: number;
  font?: string;
}

function parseRun(rNode: unknown): RunInfo {
  const info: RunInfo = {
    text: "",
    bold: false,
    italic: false,
    underline: false,
    superscript: false,
    subscript: false,
    smallCaps: false,
    hasBreak: false,
  };
  const children = findTagChildren(rNode, "w:r");
  for (const child of children) {
    const t = tagOf(child);
    if (t === "w:rPr") {
      const rprKids = findTagChildren(child, "w:rPr");
      for (const k of rprKids) {
        const kt = tagOf(k);
        if (kt === "w:b") info.bold = true;
        else if (kt === "w:i") info.italic = true;
        else if (kt === "w:u") info.underline = true;
        else if (kt === "w:smallCaps") info.smallCaps = true;
        else if (kt === "w:vertAlign") {
          const val = getAttr(k)["@_w:val"];
          if (val === "superscript") info.superscript = true;
          else if (val === "subscript") info.subscript = true;
        } else if (kt === "w:sz") {
          const val = getAttr(k)["@_w:val"];
          if (val) info.fontSize = parseInt(val, 10);
        } else if (kt === "w:rFonts") {
          info.font = getAttr(k)["@_w:ascii"];
          if (info.font) fontCounts.set(info.font, (fontCounts.get(info.font) ?? 0) + 1);
        }
      }
    } else if (t === "w:t") {
      const tKids = findTagChildren(child, "w:t");
      for (const tk of tKids) {
        if (tk && typeof tk === "object" && "#text" in tk) {
          info.text += String((tk as Record<string, unknown>)["#text"]);
        }
      }
    } else if (t === "w:tab") {
      info.text += "\t";
    } else if (t === "w:br") {
      const type = getAttr(child)["@_w:type"];
      if (type === "page") {
        info.hasBreak = true;
      } else {
        info.text += "\n"; // soft break marker
      }
    }
  }
  return info;
}

function runToCharStyle(r: RunInfo): CharStyleName | undefined {
  if (r.superscript) return "Superscript";
  if (r.subscript) return "Subscript";
  if (r.smallCaps) return "SmallCaps";
  if (r.bold && r.italic) return "BoldItalic";
  if (r.bold) return "Bold";
  if (r.italic) return "Italic";
  if (r.underline) return "Underline";
  return undefined;
}

function parseParagraph(pNode: unknown): ParagraphBlock | null {
  const kids = findTagChildren(pNode, "w:p");
  const runs: RunSpan[] = [];
  let leadingTabs = 0;
  let firstLineIndent: number | undefined;
  let leftIndent: number | undefined;
  let alignment: ParagraphBlock["alignment"];
  let hasSoftBreaks = false;
  let maxSize: number | undefined;
  let allBold = true;
  let anyRun = false;
  let allItalic = true;
  let leadingTabPhase = true;

  for (const child of kids) {
    const t = tagOf(child);
    if (t === "w:pPr") {
      const pprKids = findTagChildren(child, "w:pPr");
      for (const k of pprKids) {
        const kt = tagOf(k);
        if (kt === "w:ind") {
          const a = getAttr(k);
          if (a["@_w:firstLine"]) firstLineIndent = parseInt(a["@_w:firstLine"], 10);
          if (a["@_w:left"]) leftIndent = parseInt(a["@_w:left"], 10);
          if (a["@_w:start"]) leftIndent = parseInt(a["@_w:start"], 10);
        } else if (kt === "w:jc") {
          const v = getAttr(k)["@_w:val"];
          if (v === "center" || v === "right" || v === "left" || v === "both" || v === "justify") {
            alignment = v === "both" ? "justify" : (v as ParagraphBlock["alignment"]);
          }
        }
      }
    } else if (t === "w:r") {
      const info = parseRun(child);
      if (!info.text && !info.hasBreak) continue;
      anyRun = true;
      // Count leading tabs while we're still in pure tab territory
      let text = info.text;
      if (leadingTabPhase) {
        while (text.startsWith("\t")) {
          leadingTabs++;
          text = text.slice(1);
        }
        if (text.length > 0) leadingTabPhase = false;
      }
      if (text.includes("\n")) hasSoftBreaks = true;
      if (info.fontSize && (!maxSize || info.fontSize > maxSize)) maxSize = info.fontSize;
      if (!info.bold) allBold = false;
      if (!info.italic) allItalic = false;
      // Split on soft breaks into multiple spans (still same paragraph for now)
      const parts = text.split("\n");
      parts.forEach((part, idx) => {
        if (part.length > 0) {
          runs.push({ text: part, charStyle: runToCharStyle(info) });
        }
        if (idx < parts.length - 1) {
          runs.push({ text: "\n" });
        }
      });
    }
  }

  if (!anyRun && runs.length === 0) {
    // empty paragraph
    return {
      id: nextId(),
      kind: "paragraph",
      style: "Body",
      runs: [],
      blanksBefore: 0,
      leadingTabs: 0,
      hasSoftBreaks: false,
      rules: defaultRulesFor(),
    };
  }

  const block: ParagraphBlock = {
    id: nextId(),
    kind: "paragraph",
    style: "Body",
    runs,
    blanksBefore: 0,
    leadingTabs,
    firstLineIndent,
    leftIndent,
    hasSoftBreaks,
    fontSize: maxSize,
    isBold: anyRun ? allBold : false,
    isItalic: anyRun ? allItalic : false,
    alignment,
    rules: defaultRulesFor(),
  };
  block.style = detectParagraphStyle(block);
  return block;
}

function parseTable(tblNode: unknown): TableBlock {
  const rows: TableCellData[][] = [];
  const tblKids = findTagChildren(tblNode, "w:tbl");
  for (const child of tblKids) {
    if (tagOf(child) !== "w:tr") continue;
    const cells: TableCellData[] = [];
    const trKids = findTagChildren(child, "w:tr");
    for (const cell of trKids) {
      if (tagOf(cell) !== "w:tc") continue;
      const paragraphs: ParagraphBlock[] = [];
      const tcKids = findTagChildren(cell, "w:tc");
      for (const cc of tcKids) {
        if (tagOf(cc) === "w:p") {
          const p = parseParagraph(cc);
          if (p) paragraphs.push(p);
        }
      }
      cells.push({ paragraphs });
    }
    if (cells.length) rows.push(cells);
  }
  return { id: nextId(), kind: "table", rows };
}

export async function parseDocx(file: ArrayBuffer): Promise<ParsedDoc> {
  idCounter = 0;
  fontCounts.clear();
  const zip = await JSZip.loadAsync(file);
  const docXml = await zip.file("word/document.xml")?.async("string");
  if (!docXml) throw new Error("No word/document.xml found in file.");

  const parsed = parser.parse(docXml) as unknown[];
  // Find w:document -> w:body
  let body: unknown = null;
  for (const item of parsed) {
    if (item && typeof item === "object" && "w:document" in (item as Record<string, unknown>)) {
      const doc = (item as Record<string, unknown>)["w:document"] as unknown[];
      for (const d of doc) {
        if (d && typeof d === "object" && "w:body" in (d as Record<string, unknown>)) {
          body = (d as Record<string, unknown>)["w:body"];
          break;
        }
      }
    }
  }
  if (!body) throw new Error("No <w:body> in document.");
  const bodyChildren = body as unknown[];

  const rawBlocks: Block[] = [];
  for (const child of bodyChildren) {
    const t = tagOf(child);
    if (t === "w:p") {
      const p = parseParagraph(child);
      if (p) rawBlocks.push(p);
    } else if (t === "w:tbl") {
      rawBlocks.push(parseTable(child));
    }
  }

  // Compute blanksBefore for paragraph blocks
  const blocks: Block[] = [];
  let blankCount = 0;
  for (const b of rawBlocks) {
    if (b.kind === "paragraph" && b.runs.length === 0) {
      blankCount++;
      continue;
    }
    if (b.kind === "paragraph") {
      b.blanksBefore = blankCount;
      // Auto-rule: collapse blanks into page break if 2+
      if (blankCount >= 2) b.rules.pageBreakBefore = true;
      if (b.hasSoftBreaks) b.rules.softToHard = true;
      if (b.leadingTabs > 0 || (b.firstLineIndent ?? 0) > 0) b.rules.tabsToMargin = true;
    }
    blankCount = 0;
    blocks.push(b);
  }

  // Default paragraph styles
  const paragraphStyles: StyleDef[] = [
    { name: "Heading 1", font: "Helvetica", size: 36, bold: true, hyphenation: false, keepWithNext: true, spaceBefore: 360, spaceAfter: 120 },
    { name: "Heading 2", font: "Helvetica", size: 28, bold: true, hyphenation: false, keepWithNext: true, spaceBefore: 280, spaceAfter: 120 },
    { name: "Heading 3", font: "Helvetica", size: 24, bold: true, hyphenation: false, keepWithNext: true, spaceBefore: 240, spaceAfter: 120 },
    { name: "Body", font: "Georgia", size: 22, hyphenation: true, keepWithNext: false, spaceAfter: 120 },
    { name: "Caption", font: "Helvetica", size: 18, italic: true, hyphenation: false, keepWithNext: false },
    { name: "Quote", font: "Georgia", size: 22, italic: true, hyphenation: true, keepWithNext: false, leftIndent: 720 },
    { name: "Label", font: "Helvetica", size: 18, bold: true, hyphenation: false, keepWithNext: true },
    { name: "List", font: "Georgia", size: 22, hyphenation: true, keepWithNext: false, leftIndent: 360 },
  ];

  const charStyles: CharStyleDef[] = [
    { name: "Bold", bold: true },
    { name: "Italic", italic: true },
    { name: "BoldItalic", bold: true, italic: true },
    { name: "Underline", underline: true },
    { name: "Superscript", superscript: true },
    { name: "Subscript", subscript: true },
    { name: "SmallCaps", smallCaps: true },
  ];

  return { blocks, paragraphStyles, charStyles };
}
