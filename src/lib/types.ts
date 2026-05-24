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
  smartQuotes: boolean;
  dashes: boolean;
  trimTrailing: boolean;
  multiSpaces: "none" | "en" | "em";
}

export type BlockKind = "paragraph" | "table" | "image";

export interface ParagraphBlock {
  id: string;
  kind: "paragraph";
  style: ParagraphStyle;
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

export interface ParsedDoc {
  blocks: Block[];
  paragraphStyles: StyleDef[];
  charStyles: CharStyleDef[];
  detectedFonts: FontUsage[];
  footnotes: Footnote[];
}
