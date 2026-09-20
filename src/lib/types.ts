export type ParagraphStyle =
  | "Heading 1"
  | "Heading 2"
  | "Heading 3"
  | "Body"
  | "Caption"
  | "Quote"
  | "Label"
  | "List"
  | string;

export type CharStyleName =
  | "Bold"
  | "Italic"
  | "BoldItalic"
  | "Underline"
  | "Superscript"
  | "Subscript"
  | "SmallCaps"
  | string;

export interface RunSpan {
  text: string;
  charStyle?: CharStyleName;
  /** Reference to a footnote id when this run is a footnote anchor. */
  footnoteRef?: number;
}

export interface ParagraphRules {
  tabsToMargin: boolean;
  softToHard: boolean;
  pageBreakBefore: boolean;
  pageBreakAfter: boolean;
  keepWithNext: boolean;
  /** Word's "Keep lines together" — forces a whole paragraph onto one page. */
  keepLinesTogether: boolean;
  smartQuotes: boolean;
  dashes: boolean;
  trimTrailing: boolean;
  multiSpaces: "none" | "en" | "em";
}

/** Word paragraph pagination metadata as found in the source file. */
export interface ParagraphPagination {
  /** Effective "Keep with next". */
  keepNext: boolean;
  /** Effective "Keep lines together". */
  keepLines: boolean;
  /** Effective "Page break before" paragraph property. */
  pageBreakBefore: boolean;
  /** True when a real manual page break character (<w:br w:type="page"/>) preceded the text. */
  manualBreak: boolean;
  /** True when any of the above came from the Word paragraph style rather than the paragraph. */
  inherited: boolean;
}

export type BlockKind = "paragraph" | "table" | "image";

export interface ParagraphBlock {
  id: string;
  kind: "paragraph";
  style: ParagraphStyle;
  /** Original Word paragraph style name (or styleId if no display name) — preserved through edits for remapping. */
  sourceStyle?: string;
  runs: RunSpan[];
  /** Number of blank paragraphs preceding this one in the source. */
  blanksBefore: number;
  /** Leading tab count detected in the source. */
  leadingTabs: number;
  /** First-line indent in twips, if any. */
  firstLineIndent?: number;
  /** Left indent in twips. */
  leftIndent?: number;
  /** True if source had soft line breaks (<w:br/>). */
  hasSoftBreaks: boolean;
  /** True if paragraph contains two or more spaces in a row. */
  hasMultiSpaces: boolean;
  /** Detected font size in half-points (Word convention). */
  fontSize?: number;
  /** True if entire paragraph is bold. */
  isBold?: boolean;
  isItalic?: boolean;
  alignment?: "left" | "center" | "right" | "justify";
  /** True when the paragraph immediately follows a section break in the source. */
  sectionBreakBefore?: boolean;
  /** Word pagination metadata captured at parse time. */
  pagination?: ParagraphPagination;
  /** Per-paragraph override for space before, in twips (1pt = 20 twips). */
  spaceBefore?: number;
  /** Per-paragraph override for space after, in twips. */
  spaceAfter?: number;
  /** When set, paragraph is part of a normalized list. */
  listKind?: "bullet" | "number";
  rules: ParagraphRules;
  /** Snapshot of style/runs/rules right after parsing — used for change tracking & revert. */
  original?: {
    style: ParagraphStyle;
    runs: RunSpan[];
    rules: ParagraphRules;
  };
}

export interface TableCellData {
  paragraphs: ParagraphBlock[];
}

export interface TableBlock {
  id: string;
  kind: "table";
  rows: TableCellData[][];
}

export type Block = ParagraphBlock | TableBlock;

export interface StyleDef {
  name: ParagraphStyle;
  font?: string;
  size?: number; // half-points
  bold?: boolean;
  italic?: boolean;
  alignment?: "left" | "center" | "right" | "justify";
  spaceBefore?: number; // twips
  spaceAfter?: number;
  lineSpacing?: number; // twips (240 = single)
  leftIndent?: number;
  firstLineIndent?: number;
  hyphenation: boolean;
  keepWithNext: boolean;
}

export interface CharStyleDef {
  name: CharStyleName;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  superscript?: boolean;
  subscript?: boolean;
  smallCaps?: boolean;
}

export interface FontUsage {
  name: string;
  count: number;
}

export interface Footnote {
  id: number;
  paragraphs: ParagraphBlock[];
}

export interface PreflightWarnings {
  /** Count of <w:ins> runs auto-accepted (tracked insertions kept). */
  trackedInsertions: number;
  /** Count of <w:del> runs auto-removed (tracked deletions dropped). */
  trackedDeletions: number;
  /** Count of runs carrying <w:vanish/> that were auto-stripped. */
  hiddenRuns: number;
  /** Count of <w:txbxContent> blocks — these silently truncate InDesign imports & eat index markers. */
  textBoxes: number;
  /** Body paragraphs carrying "Keep with next". */
  keepWithNextParas: number;
  /** Body paragraphs carrying "Keep lines together". */
  keepLinesParas: number;
  /** Body paragraphs carrying a "Page break before" paragraph property (no manual break character). */
  pageBreakBeforeParas: number;
  /** Longest run of consecutive paragraphs all marked "Keep with next". */
  keepWithNextChain: number;
  /** True when pagination settings appear to come from a Word style applied to nearly everything. */
  paginationFromStyles: boolean;
}

export const EMPTY_PREFLIGHT_WARNINGS: PreflightWarnings = {
  trackedInsertions: 0,
  trackedDeletions: 0,
  hiddenRuns: 0,
  textBoxes: 0,
  keepWithNextParas: 0,
  keepLinesParas: 0,
  pageBreakBeforeParas: 0,
  keepWithNextChain: 0,
  paginationFromStyles: false,
};



export interface ParsedDoc {
  blocks: Block[];
  paragraphStyles: StyleDef[];
  charStyles: CharStyleDef[];
  detectedFonts: FontUsage[];
  footnotes: Footnote[];
  /** Silent-corruption risks detected & auto-resolved at parse time. */
  preflightWarnings: PreflightWarnings;
}
