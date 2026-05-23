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
}

export interface ParagraphRules {
  tabsToMargin: boolean;
  softToHard: boolean;
  pageBreakBefore: boolean;
  keepWithNext: boolean;
  smartQuotes: boolean;
  dashes: boolean;
  trimTrailing: boolean;
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
  /** Detected font size in half-points (Word convention). */
  fontSize?: number;
  /** True if entire paragraph is bold. */
  isBold?: boolean;
  isItalic?: boolean;
  alignment?: "left" | "center" | "right" | "justify";
  rules: ParagraphRules;
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

export interface ParsedDoc {
  blocks: Block[];
  paragraphStyles: StyleDef[];
  charStyles: CharStyleDef[];
}
