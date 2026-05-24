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
let sectionBreakSeen = false;
let styleIdToName = new Map<string, string>();

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

function isUnderlineEnabled(item: unknown): boolean {
  const raw = getAttr(item)["@_w:val"];
  if (raw === undefined) return true;
  const val = String(raw).trim().toLowerCase();
  return val !== "" && val !== "none" && val !== "nil" && val !== "0" && val !== "false";
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
  /** Page break appeared before any text in this run. */
  breakBefore: boolean;
  /** Page break appeared after text in this run. */
  breakAfter: boolean;
  fontSize?: number;
  font?: string;
  footnoteRef?: number;
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
    breakBefore: false,
    breakAfter: false,
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
        else if (kt === "w:u") info.underline = isUnderlineEnabled(k);
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
        if (info.text.length === 0) info.breakBefore = true;
        else info.breakAfter = true;
      } else {
        info.text += "\n"; // soft break marker
      }
    } else if (t === "w:footnoteReference") {
      const id = parseInt(getAttr(child)["@_w:id"] ?? "", 10);
      if (!Number.isNaN(id)) info.footnoteRef = id;
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
  let hasSectPr = false;
  let pPrPageBreakBefore = false;
  let pageBreakBefore = false;
  let pageBreakAfter = false;
  let anyTextSeen = false;
  let sourceStyleId: string | undefined;

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
        } else if (kt === "w:sectPr") {
          hasSectPr = true;
        } else if (kt === "w:pageBreakBefore") {
          const v = getAttr(k)["@_w:val"];
          // Default is true when element is present; only false if explicitly "0"/"false"
          if (v === undefined || (v !== "0" && v !== "false")) pPrPageBreakBefore = true;
        } else if (kt === "w:pStyle") {
          sourceStyleId = getAttr(k)["@_w:val"];
        }
      }
    } else if (t === "w:r") {
      const info = parseRun(child);
      if (!info.text && !info.hasBreak && info.footnoteRef === undefined) continue;
      anyRun = true;
      if (info.breakBefore && !anyTextSeen) pageBreakBefore = true;
      // Count leading tabs while we're still in pure tab territory
      let text = info.text;
      if (leadingTabPhase) {
        while (text.startsWith("\t")) {
          leadingTabs++;
          text = text.slice(1);
        }
        if (text.length > 0) leadingTabPhase = false;
      }
      if (text.length > 0) anyTextSeen = true;
      if (text.includes("\n")) hasSoftBreaks = true;
      if (info.fontSize && (!maxSize || info.fontSize > maxSize)) maxSize = info.fontSize;
      if (!info.bold) allBold = false;
      if (!info.italic) allItalic = false;
      if (info.footnoteRef !== undefined && !text) {
        runs.push({ text: "", footnoteRef: info.footnoteRef });
        if (info.breakAfter) pageBreakAfter = true;
        else if (info.hasBreak && !info.breakBefore) pageBreakAfter = true;
        continue;
      }
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
      if (info.footnoteRef !== undefined) {
        runs.push({ text: "", footnoteRef: info.footnoteRef });
      }
      if (info.breakAfter) pageBreakAfter = true;
      // A break in a run with no text and no breakBefore detection still acts as a trailing break
      if (info.hasBreak && !info.breakBefore && !info.breakAfter) pageBreakAfter = true;
    }
  }

  // Stash section break flag on a separate marker — handled by caller via a side-channel
  if (hasSectPr) sectionBreakSeen = true;


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
      hasMultiSpaces: false,
      rules: defaultRulesFor(),
    };
  }

  const fullText = runs.map((r) => r.text).join("");
  const hasMultiSpaces = /  +/.test(fullText);

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
    hasMultiSpaces,
    fontSize: maxSize,
    isBold: anyRun ? allBold : false,
    isItalic: anyRun ? allItalic : false,
    alignment,
    rules: {
      ...defaultRulesFor(),
      pageBreakBefore: pageBreakBefore || pPrPageBreakBefore,
      pageBreakAfter,
    },
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

export async function parseDocx(
  file: ArrayBuffer,
  onProgress?: (progress: number, label: string) => void,
): Promise<ParsedDoc> {
  const yieldTick = () => new Promise<void>((r) => setTimeout(r, 0));
  const report = async (p: number, l: string) => {
    onProgress?.(p, l);
    await yieldTick();
  };

  idCounter = 0;
  fontCounts.clear();
  sectionBreakSeen = false;
  await report(0.02, "Reading file…");
  const zip = await JSZip.loadAsync(file);
  await report(0.15, "Extracting document…");
  const docXml = await zip.file("word/document.xml")?.async("string");
  if (!docXml) throw new Error("No word/document.xml found in file.");

  await report(0.25, "Parsing XML…");
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
  const sectionAfterIdx = new Set<number>();
  const total = bodyChildren.length || 1;
  let processed = 0;
  for (const child of bodyChildren) {
    const t = tagOf(child);
    if (t === "w:p") {
      sectionBreakSeen = false;
      const p = parseParagraph(child);
      if (p) {
        rawBlocks.push(p);
        if (sectionBreakSeen) sectionAfterIdx.add(rawBlocks.length - 1);
      }
    } else if (t === "w:tbl") {
      rawBlocks.push(parseTable(child));
    }
    processed++;
    if (processed % 50 === 0) {
      await report(0.3 + 0.55 * (processed / total), `Parsing paragraphs… (${processed}/${total})`);
    }
  }
  await report(0.88, "Finalizing…");


  // Compute blanksBefore for paragraph blocks; promote section breaks to page break
  const blocks: Block[] = [];
  let blankCount = 0;
  let pendingSectionBreak = false;
  for (let i = 0; i < rawBlocks.length; i++) {
    const b = rawBlocks[i];
    if (b.kind === "paragraph" && b.runs.length === 0) {
      blankCount++;
      if (sectionAfterIdx.has(i)) pendingSectionBreak = true;
      continue;
    }
    if (b.kind === "paragraph") {
      b.blanksBefore = blankCount;
      if (blankCount >= 2) b.rules.pageBreakBefore = true;
      if (b.hasSoftBreaks) b.rules.softToHard = true;
      if (b.leadingTabs > 0 || (b.firstLineIndent ?? 0) > 0) b.rules.tabsToMargin = true;
      if (pendingSectionBreak) {
        b.sectionBreakBefore = true;
        b.rules.pageBreakBefore = true;
      }
    }
    if (sectionAfterIdx.has(i)) pendingSectionBreak = true;
    else pendingSectionBreak = false;
    blankCount = 0;
    blocks.push(b);
  }

  // Parse footnotes (if present)
  const footnotes: import("./types").Footnote[] = [];
  const footnotesXml = await zip.file("word/footnotes.xml")?.async("string");
  if (footnotesXml) {
    const fnParsed = parser.parse(footnotesXml) as unknown[];
    for (const item of fnParsed) {
      if (!item || typeof item !== "object") continue;
      const root = (item as Record<string, unknown>)["w:footnotes"];
      if (!Array.isArray(root)) continue;
      for (const fn of root) {
        if (!fn || typeof fn !== "object") continue;
        if (tagOf(fn) !== "w:footnote") continue;
        const attrs = getAttr(fn);
        const id = parseInt(attrs["@_w:id"] ?? "", 10);
        const type = attrs["@_w:type"];
        if (Number.isNaN(id) || id < 0 || type === "separator" || type === "continuationSeparator") continue;
        const fnKids = findTagChildren(fn, "w:footnote");
        const paragraphs: ParagraphBlock[] = [];
        for (const fk of fnKids) {
          if (tagOf(fk) === "w:p") {
            const p = parseParagraph(fk);
            if (p && p.runs.length > 0) paragraphs.push(p);
          }
        }
        if (paragraphs.length) footnotes.push({ id, paragraphs });
      }
    }
  }

  // Snapshot original state for change tracking (post-parse baseline)
  const snapshot = (p: ParagraphBlock) => {
    p.original = {
      style: p.style,
      runs: p.runs.map((r) => ({ ...r })),
      rules: { ...p.rules },
    };
  };
  for (const b of blocks) {
    if (b.kind === "paragraph") snapshot(b);
    else
      for (const row of b.rows)
        for (const cell of row)
          for (const p of cell.paragraphs) snapshot(p);
  }
  for (const fn of footnotes) for (const p of fn.paragraphs) snapshot(p);

  // (snapshot already added above)

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

  const detectedFonts = [...fontCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return { blocks, paragraphStyles, charStyles, detectedFonts, footnotes };
}
