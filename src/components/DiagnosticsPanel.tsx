import { useMemo } from "react";
import { useEditor } from "@/store/editor";
import type { Block, ParagraphBlock } from "@/lib/types";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

interface Finding {
  key: string;
  label: string;
  count: number;
  severity: "info" | "warn" | "ok";
  hint?: string;
}

function walk(blocks: Block[], fn: (p: ParagraphBlock) => void) {
  for (const b of blocks) {
    if (b.kind === "paragraph") fn(b);
    else b.rows.forEach((r) => r.forEach((c) => c.paragraphs.forEach(fn)));
  }
}

export function DiagnosticsPanel() {
  const doc = useEditor((s) => s.doc);

  const findings = useMemo<Finding[]>(() => {
    if (!doc) return [];
    let paragraphs = 0;
    let tables = 0;
    let emptyPara = 0;
    let softReturns = 0;
    let multiSpacePara = 0;
    let leadingTabPara = 0;
    let pageBreaks = 0;
    let doubleHyphens = 0;
    let straightQuotes = 0;
    let styledTrailingWs = 0; // bleed candidates
    const sourceStyles = new Set<string>();
    let unstyledPara = 0;

    for (const b of doc.blocks) {
      if (b.kind === "table") {
        tables++;
        b.rows.forEach((r) =>
          r.forEach((c) =>
            c.paragraphs.forEach((p) => inspectPara(p)),
          ),
        );
      } else inspectPara(b);
    }

    function inspectPara(p: ParagraphBlock) {
      paragraphs++;
      if (p.sourceStyle) sourceStyles.add(p.sourceStyle);
      else unstyledPara++;
      const text = p.runs.map((r) => r.text).join("");
      if (!text.trim()) emptyPara++;
      if (p.hasSoftBreaks) softReturns++;
      if (p.hasMultiSpaces) multiSpacePara++;
      if (p.leadingTabs > 0) leadingTabPara++;
      if (p.rules.pageBreakBefore || p.rules.pageBreakAfter) pageBreaks++;
      if (text.includes("--")) doubleHyphens++;
      if (/['"]/.test(text)) straightQuotes++;
      for (const r of p.runs) {
        if (r.charStyle && r.text && /\s$/.test(r.text)) styledTrailingWs++;
      }
    }

    const result: Finding[] = [
      { key: "para", label: "Paragraphs", count: paragraphs, severity: "info" },
      { key: "src", label: "Unique source styles", count: sourceStyles.size, severity: "info" },
      { key: "unstyled", label: "Unstyled paragraphs", count: unstyledPara, severity: unstyledPara > 0 ? "warn" : "ok", hint: "No w:pStyle in source — will fall back to default Body." },
      { key: "tables", label: "Tables", count: tables, severity: "info" },
      { key: "fn", label: "Footnotes", count: doc.footnotes.length, severity: "info" },
      { key: "fonts", label: "Fonts detected", count: doc.detectedFonts.length, severity: doc.detectedFonts.length > 3 ? "warn" : "ok", hint: doc.detectedFonts.length > 3 ? "Consider normalizing to fewer fonts before import." : undefined },
      { key: "soft", label: "Paragraphs with soft returns", count: softReturns, severity: softReturns > 0 ? "warn" : "ok", hint: "Use 'Soft → hard breaks' to convert." },
      { key: "spaces", label: "Paragraphs with multi-spaces", count: multiSpacePara, severity: multiSpacePara > 0 ? "warn" : "ok" },
      { key: "tabs", label: "Paragraphs with leading tabs", count: leadingTabPara, severity: leadingTabPara > 0 ? "warn" : "ok", hint: "Convert to first-line indent via 'Tabs → indent'." },
      { key: "empty", label: "Empty paragraphs", count: emptyPara, severity: emptyPara > 5 ? "warn" : "ok" },
      { key: "pb", label: "Page breaks", count: pageBreaks, severity: "info" },
      { key: "dash", label: "Double-hyphen ' -- ' instances", count: doubleHyphens, severity: doubleHyphens > 0 ? "warn" : "ok", hint: "Enable 'Em dashes' cleanup." },
      { key: "qq", label: "Paragraphs with straight quotes", count: straightQuotes, severity: straightQuotes > 0 ? "warn" : "ok", hint: "Enable 'Smart quotes'." },
      { key: "bleed", label: "Bleed-candidate runs (styled trailing space)", count: styledTrailingWs, severity: styledTrailingWs > 0 ? "warn" : "ok", hint: "Run 'Trim italic/bold bleed' or 'Close orphan runs'." },
    ];
    return result;
  }, [doc]);

  if (!doc) return null;

  const warnings = findings.filter((f) => f.severity === "warn" && f.count > 0);

  return (
    <div className="px-3 py-3 text-xs">
      <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        Pre-import diagnostics
        {warnings.length > 0 && (
          <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-600">
            {warnings.length} to review
          </span>
        )}
      </p>
      <ul className="space-y-0.5">
        {findings.map((f) => {
          const dim = f.count === 0 && f.severity !== "info";
          return (
            <li
              key={f.key}
              className={`flex items-start justify-between gap-2 rounded px-1.5 py-1 ${
                dim ? "opacity-50" : ""
              }`}
              title={f.hint}
            >
              <span className="flex min-w-0 items-start gap-1.5">
                <SeverityIcon severity={f.severity} count={f.count} />
                <span className="min-w-0 flex-1 leading-tight text-foreground">
                  <span className="block truncate text-[11px]">{f.label}</span>
                  {f.hint && f.count > 0 && f.severity === "warn" && (
                    <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground">
                      {f.hint}
                    </span>
                  )}
                </span>
              </span>
              <span
                className={`shrink-0 tabular-nums text-[11px] font-semibold ${
                  f.severity === "warn" && f.count > 0
                    ? "text-amber-600"
                    : "text-muted-foreground"
                }`}
              >
                {f.count.toLocaleString()}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SeverityIcon({ severity, count }: { severity: Finding["severity"]; count: number }) {
  if (severity === "info") return <Info className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />;
  if (severity === "warn" && count > 0)
    return <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />;
  return <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500/70" />;
}
