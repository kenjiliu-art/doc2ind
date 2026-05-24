import type {
  Block,
  ParagraphBlock,
  ParsedDoc,
  RunSpan,
  StyleDef,
} from "./types";

function eachParagraph(blocks: Block[], fn: (p: ParagraphBlock, prev: ParagraphBlock | undefined) => void) {
  let prev: ParagraphBlock | undefined;
  for (const b of blocks) {
    if (b.kind === "paragraph") {
      fn(b, prev);
      prev = b;
    } else {
      for (const row of b.rows)
        for (const cell of row)
          for (const p of cell.paragraphs) {
            fn(p, prev);
            prev = p;
          }
    }
  }
}

function mapParagraphs(blocks: Block[], fn: (p: ParagraphBlock) => ParagraphBlock): Block[] {
  return blocks.map((b) => {
    if (b.kind === "paragraph") return fn(b);
    return {
      ...b,
      rows: b.rows.map((row) =>
        row.map((cell) => ({ ...cell, paragraphs: cell.paragraphs.map(fn) })),
      ),
    };
  });
}

/** 1. Drop paragraph + character style defs that no paragraph references. */
export function stripUnusedStyles(doc: ParsedDoc): ParsedDoc {
  const usedPara = new Set<string>();
  const usedChar = new Set<string>();
  eachParagraph(doc.blocks, (p) => {
    usedPara.add(p.style);
    for (const r of p.runs) if (r.charStyle) usedChar.add(r.charStyle);
  });
  for (const fn of doc.footnotes)
    for (const p of fn.paragraphs) {
      usedPara.add(p.style);
      for (const r of p.runs) if (r.charStyle) usedChar.add(r.charStyle);
    }
  return {
    ...doc,
    paragraphStyles: doc.paragraphStyles.filter((s) => usedPara.has(s.name)),
    charStyles: doc.charStyles.filter((c) => usedChar.has(c.name)),
  };
}

/** 3. Bump preceding paragraph's style.spaceAfter based on observed blank lines. */
export function collapseBlanksToSpacing(doc: ParsedDoc): ParsedDoc {
  // Map of style name -> max blanksBefore observed on the following paragraph
  const bumps = new Map<string, number>();
  let prev: ParagraphBlock | undefined;
  eachParagraph(doc.blocks, (p) => {
    if (prev && p.blanksBefore > 0) {
      const cur = bumps.get(prev.style) ?? 0;
      if (p.blanksBefore > cur) bumps.set(prev.style, p.blanksBefore);
    }
    prev = p;
  });
  const paragraphStyles = doc.paragraphStyles.map((s) => {
    const extra = bumps.get(s.name);
    if (!extra) return s;
    const added = extra * 240; // 240 twips ≈ one 12pt line
    return { ...s, spaceAfter: Math.max(s.spaceAfter ?? 0, (s.spaceAfter ?? 0) + added) };
  });
  // Also zero blanksBefore so a future re-run doesn't double-count
  const blocks = mapParagraphs(doc.blocks, (p) => ({ ...p, blanksBefore: 0 }));
  return { ...doc, paragraphStyles, blocks };
}

/** 4. Detect bullet/number prefixes in paragraph text and convert to list paragraphs. */
const BULLET_RE = /^([\u2022\u25E6\u25AA\u00B7•\-\*])\s+/;
const NUMBER_RE = /^(\d+)[.)]\s+/;
export function normalizeLists(doc: ParsedDoc): ParsedDoc {
  const blocks = mapParagraphs(doc.blocks, (p) => {
    if (p.listKind || p.runs.length === 0) return p;
    const first = p.runs[0];
    if (!first || !first.text) return p;
    let kind: "bullet" | "number" | undefined;
    let stripped = first.text;
    if (BULLET_RE.test(stripped)) {
      kind = "bullet";
      stripped = stripped.replace(BULLET_RE, "");
    } else if (NUMBER_RE.test(stripped)) {
      kind = "number";
      stripped = stripped.replace(NUMBER_RE, "");
    }
    if (!kind) return p;
    const newRuns = [...p.runs];
    newRuns[0] = { ...first, text: stripped };
    return { ...p, listKind: kind, runs: newRuns, style: "List" };
  });
  return { ...doc, blocks };
}

/** 5. Move trailing whitespace out of a styled run to prevent italic/bold leaking. */
export function closeOrphanRuns(doc: ParsedDoc): ParsedDoc {
  const fix = (runs: RunSpan[]): RunSpan[] => {
    const out: RunSpan[] = [];
    for (const r of runs) {
      if (!r.charStyle || !r.text) {
        out.push(r);
        continue;
      }
      // Run is purely whitespace → drop the charStyle entirely
      if (/^\s+$/.test(r.text)) {
        out.push({ text: r.text });
        continue;
      }
      // Split trailing whitespace into an unstyled run
      const m = r.text.match(/^(.*?)(\s+)$/s);
      if (m) {
        out.push({ text: m[1], charStyle: r.charStyle });
        out.push({ text: m[2] });
      } else {
        out.push(r);
      }
    }
    return out;
  };
  const blocks = mapParagraphs(doc.blocks, (p) => ({ ...p, runs: fix(p.runs) }));
  return { ...doc, blocks };
}

/** Strip trailing whitespace AND punctuation out of styled runs so italic/bold don't bleed past the styled phrase. */
const BLEED_TAIL = /[\s.,;:!?\)\]\}\u2019\u201D\u2026"'`]+$/;
export function trimRunBleed(doc: ParsedDoc): ParsedDoc {
  const fix = (runs: RunSpan[]): RunSpan[] => {
    const out: RunSpan[] = [];
    for (const r of runs) {
      if (!r.charStyle || !r.text || r.footnoteRef !== undefined) {
        out.push(r);
        continue;
      }
      if (BLEED_TAIL.test(r.text) && /^[\s.,;:!?\)\]\}\u2019\u201D\u2026"'`]+$/.test(r.text)) {
        // Run is entirely tail chars → drop the charStyle
        out.push({ text: r.text });
        continue;
      }
      const m = r.text.match(BLEED_TAIL);
      if (m) {
        const head = r.text.slice(0, r.text.length - m[0].length);
        out.push({ text: head, charStyle: r.charStyle });
        out.push({ text: m[0] });
      } else {
        out.push(r);
      }
    }
    return out;
  };
  const blocks = mapParagraphs(doc.blocks, (p) => ({ ...p, runs: fix(p.runs) }));
  return { ...doc, blocks };
}

/** 8. Promote section breaks (already marked by the parser) to clean page-break-before. */
export function sectionBreaksToPageBreaks(doc: ParsedDoc): ParsedDoc {
  const blocks = mapParagraphs(doc.blocks, (p) =>
    p.sectionBreakBefore ? { ...p, rules: { ...p.rules, pageBreakBefore: true } } : p,
  );
  return { ...doc, blocks };
}

/** 13. Rename messy style names like "Normal + Bold + 12pt" to a clean label. */
const MESSY_NAME_RE = /\s*\+\s*|^Default Paragraph Font\s*\+/i;
function cleanName(name: string, used: Set<string>): string {
  let base = name.split(MESSY_NAME_RE)[0].trim() || "Body";
  // Capitalize first letter, simplify whitespace
  base = base.replace(/\s+/g, " ");
  if (base.toLowerCase() === "normal") base = "Body";
  let candidate = base;
  let n = 2;
  while (used.has(candidate)) candidate = `${base} ${n++}`;
  used.add(candidate);
  return candidate;
}
export function sanitizeStyleNames(doc: ParsedDoc): ParsedDoc {
  const rename = new Map<string, string>();
  const used = new Set<string>();
  // Reserve clean existing names first
  for (const s of doc.paragraphStyles) if (!/\s\+\s/.test(s.name)) used.add(s.name);
  const paragraphStyles: StyleDef[] = doc.paragraphStyles.map((s) => {
    if (!/\s\+\s/.test(s.name)) return s;
    const clean = cleanName(s.name, used);
    rename.set(s.name, clean);
    return { ...s, name: clean };
  });
  if (rename.size === 0) return doc;
  const blocks = mapParagraphs(doc.blocks, (p) =>
    rename.has(p.style) ? { ...p, style: rename.get(p.style)! } : p,
  );
  return { ...doc, paragraphStyles, blocks };
}
