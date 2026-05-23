import type { ParagraphBlock, ParagraphRules, ParagraphStyle } from "./types";

export function defaultRulesFor(): ParagraphRules {
  return {
    tabsToMargin: false,
    softToHard: false,
    pageBreakBefore: false,
    keepWithNext: false,
    smartQuotes: true,
    trimTrailing: true,
  };
}

export function detectParagraphStyle(p: ParagraphBlock): ParagraphStyle {
  const text = p.runs.map((r) => r.text).join("").trim();
  if (!text) return "Body";

  const sizePt = p.fontSize ? p.fontSize / 2 : undefined;
  const bold = p.isBold === true;
  const italic = p.isItalic === true;

  if (sizePt && sizePt >= 18 && bold) return "Heading 1";
  if (sizePt && sizePt >= 14 && sizePt < 18 && bold) return "Heading 2";
  if (sizePt && sizePt >= 12 && sizePt < 14 && bold) return "Heading 3";

  if (text.length < 80 && text === text.toUpperCase() && /[A-Z]/.test(text)) return "Label";

  if (italic && (p.leftIndent ?? 0) > 360) return "Quote";

  if (/^([\u2022\-*]|\d+[.)])\s/.test(text)) return "List";

  return "Body";
}
