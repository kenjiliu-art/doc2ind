import { useMemo, useState } from "react";
import { useEditor } from "@/store/editor";
import type { Block, ParagraphBlock } from "@/lib/types";
import { AlertTriangle, CheckCircle2, Info, Crosshair, ChevronDown, Wand2, Sparkles } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";

type Severity = "info" | "warn" | "ok" | "fixed";

interface Finding {
  key: string;
  label: string;
  count: number;
  severity: Severity;
  hint?: string;
  /** Number auto-fixed by an active cleanup rule. */
  fixed?: number;
  /** Ordered paragraph ids that match this finding (for jump-to-paragraph). */
  ids: string[];
}

interface Props {
  onJump?: (id: string) => void;
}

function paraText(p: ParagraphBlock) {
  return p.runs.map((r) => r.text).join("");
}

export function DiagnosticsPanel({ onJump }: Props) {
  const doc = useEditor((s) => s.doc);
  const [cursors, setCursors] = useState<Record<string, number>>({});

  const { findings, autoFixed } = useMemo(() => {
    if (!doc) return { findings: [] as Finding[], autoFixed: [] as { label: string; count: number }[] };

    const ids = {
      unstyled: [] as string[],
      soft: [] as string[],
      spaces: [] as string[],
      tabs: [] as string[],
      empty: [] as string[],
      pb: [] as string[],
      dash: [] as string[],
      qq: [] as string[],
      bleed: [] as string[],
    };
    let paragraphs = 0;
    let tables = 0;
    const sourceStyles = new Set<string>();

    const auto = {
      soft: 0,
      tabs: 0,
      spaces: 0,
      dash: 0,
      qq: 0,
    };

    const inspectPara = (p: ParagraphBlock) => {
      paragraphs++;
      if (p.sourceStyle) sourceStyles.add(p.sourceStyle);
      else ids.unstyled.push(p.id);
      const text = paraText(p);
      if (!text.trim()) ids.empty.push(p.id);
      if (p.hasSoftBreaks) {
        ids.soft.push(p.id);
        if (p.rules.softToHard) auto.soft++;
      }
      if (p.hasMultiSpaces) {
        ids.spaces.push(p.id);
        if (p.rules.trimTrailing) auto.spaces++;
      }
      if (p.leadingTabs > 0) {
        ids.tabs.push(p.id);
        if (p.rules.tabsToMargin) auto.tabs++;
      }
      if (p.rules.pageBreakBefore || p.rules.pageBreakAfter) ids.pb.push(p.id);
      if (text.includes("--")) {
        ids.dash.push(p.id);
        if (p.rules.dashes) auto.dash++;
      }
      if (/['"]/.test(text)) {
        ids.qq.push(p.id);
        if (p.rules.smartQuotes) auto.qq++;
      }
      for (const r of p.runs) {
        if (r.charStyle && r.text && /\s$/.test(r.text)) {
          ids.bleed.push(p.id);
          break;
        }
      }
    };

    const walk = (blocks: Block[]) => {
      for (const b of blocks) {
        if (b.kind === "table") {
          tables++;
          b.rows.forEach((r) =>
            r.forEach((c) => c.paragraphs.forEach(inspectPara)),
          );
        } else inspectPara(b);
      }
    };
    walk(doc.blocks);

    const fixed: { label: string; count: number }[] = [];
    if (auto.soft > 0) fixed.push({ label: "soft returns", count: auto.soft });
    if (auto.tabs > 0) fixed.push({ label: "tabs", count: auto.tabs });
    if (auto.spaces > 0) fixed.push({ label: "multi-spaces", count: auto.spaces });
    if (auto.dash > 0) fixed.push({ label: "double-hyphens", count: auto.dash });
    if (auto.qq > 0) fixed.push({ label: "straight quotes", count: auto.qq });

    const f = (
      key: string,
      label: string,
      count: number,
      severity: Severity,
      hint?: string,
      paraIds: string[] = [],
      fixedCount?: number,
    ): Finding => ({ key, label, count, severity, hint, ids: paraIds, fixed: fixedCount });

    /** Severity for an auto-fixable issue: 'fixed' when rule covers all matches. */
    const fixSev = (count: number, fixedCount: number): Severity => {
      if (count === 0) return "ok";
      if (fixedCount >= count) return "fixed";
      return "warn";
    };

    const findings: Finding[] = [
      f("para", "Paragraphs", paragraphs, "info"),
      f("src", "Unique source styles", sourceStyles.size, "info"),
      f(
        "unstyled",
        "Unstyled paragraphs",
        ids.unstyled.length,
        ids.unstyled.length > 0 ? "warn" : "ok",
        "No w:pStyle in source — will fall back to default Body.",
        ids.unstyled,
      ),
      f("tables", "Tables", tables, "info"),
      f("fn", "Footnotes", doc.footnotes.length, "info"),
      f(
        "fonts",
        "Fonts detected",
        doc.detectedFonts.length,
        doc.detectedFonts.length > 3 ? "warn" : "ok",
        doc.detectedFonts.length > 3
          ? "Consider normalizing to fewer fonts before import."
          : undefined,
      ),
      f(
        "soft",
        "Paragraphs with soft returns",
        ids.soft.length,
        fixSev(ids.soft.length, auto.soft),
        "Use 'Soft → hard breaks' to convert.",
        ids.soft,
        auto.soft,
      ),
      f(
        "spaces",
        "Paragraphs with multi-spaces",
        ids.spaces.length,
        fixSev(ids.spaces.length, auto.spaces),
        undefined,
        ids.spaces,
        auto.spaces,
      ),
      f(
        "tabs",
        "Paragraphs with leading tabs",
        ids.tabs.length,
        fixSev(ids.tabs.length, auto.tabs),
        "Convert to first-line indent via 'Tabs → indent'.",
        ids.tabs,
        auto.tabs,
      ),
      f(
        "empty",
        "Empty paragraphs",
        ids.empty.length,
        ids.empty.length > 5 ? "warn" : "ok",
        undefined,
        ids.empty,
      ),
      f("pb", "Page breaks", ids.pb.length, "info", undefined, ids.pb),
      f(
        "dash",
        "Double-hyphen ' -- ' instances",
        ids.dash.length,
        fixSev(ids.dash.length, auto.dash),
        "Enable 'Em dashes' cleanup.",
        ids.dash,
        auto.dash,
      ),
      f(
        "qq",
        "Paragraphs with straight quotes",
        ids.qq.length,
        fixSev(ids.qq.length, auto.qq),
        "Enable 'Smart quotes'.",
        ids.qq,
        auto.qq,
      ),
      f(
        "bleed",
        "Bleed-candidate runs (styled trailing space)",
        ids.bleed.length,
        ids.bleed.length > 1 ? "warn" : "ok",
        "Run 'Trim italic/bold bleed' or 'Close orphan runs'.",
        ids.bleed,
      ),
    ];

    return { findings, autoFixed: fixed };
  }, [doc]);

  if (!doc) return null;

  const warnings = findings.filter((f) => f.severity === "warn" && f.count > 0);

  const handleJump = (finding: Finding) => {
    if (!onJump || finding.ids.length === 0) return;
    const i = cursors[finding.key] ?? -1;
    const next = (i + 1) % finding.ids.length;
    setCursors((c) => ({ ...c, [finding.key]: next }));
    const id = finding.ids[next];
    onJump(id);
    // Scroll + flash the matching paragraph in the preview.
    requestAnimationFrame(() => {
      const el = document.querySelector(
        `[data-para-id="${id}"]`,
      ) as HTMLElement | null;
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("diag-flash");
      window.setTimeout(() => el.classList.remove("diag-flash"), 1400);
    });
  };

  return (
    <div className="px-3 py-3 text-xs">
      <Collapsible defaultOpen={false}>
        <CollapsibleTrigger className="mb-1.5 flex w-full items-center gap-1.5 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground [&[data-state=open]>svg]:rotate-180">
          Pre-import diagnostics
          {warnings.length > 0 ? (
            <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-600">
              {warnings.length} to review
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600">
              <CheckCircle2 className="h-2.5 w-2.5" /> All clear
            </span>
          )}
          <ChevronDown className="ml-auto h-3.5 w-3.5 shrink-0 transition-transform" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          {autoFixed.length > 0 && (
            <p className="mb-2 flex items-center gap-1.5 rounded border border-emerald-500/20 bg-emerald-500/5 px-2 py-1.5 text-[10px] leading-snug text-emerald-700 dark:text-emerald-400">
              <Wand2 className="h-3 w-3 shrink-0" />
              <span>
                Auto-fixed: {autoFixed.map((a) => `${a.label} (${a.count})`).join(", ")}
              </span>
            </p>
          )}
          {warnings.length === 0 && autoFixed.length === 0 && (
            <p className="mb-2 rounded border border-emerald-500/20 bg-emerald-500/5 px-2 py-1.5 text-[10px] leading-snug text-emerald-700 dark:text-emerald-400">
              No structural issues detected. You can safely export — or skim the
              counts below for context.
            </p>
          )}
          <ul className="space-y-0.5">
            {findings.map((f) => {
              const dim = f.count === 0 && f.severity !== "info";
              const jumpable = !!onJump && f.ids.length > 0;
              const cursor = cursors[f.key];
              const position =
                jumpable && cursor !== undefined
                  ? `${cursor + 1}/${f.ids.length}`
                  : null;
              return (
                <li
                  key={f.key}
                  className={`group flex items-start justify-between gap-2 rounded px-1.5 py-1 ${
                    dim ? "opacity-50" : ""
                  } ${jumpable ? "cursor-pointer hover:bg-sidebar-accent/70" : ""}`}
                  title={
                    jumpable
                      ? `${f.hint ? f.hint + " — " : ""}Click to jump to the next match`
                      : f.hint
                  }
                  onClick={jumpable ? () => handleJump(f) : undefined}
                  role={jumpable ? "button" : undefined}
                  tabIndex={jumpable ? 0 : undefined}
                  onKeyDown={
                    jumpable
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleJump(f);
                          }
                        }
                      : undefined
                  }
                >
                  <span className="flex min-w-0 items-start gap-1.5">
                    <SeverityIcon severity={f.severity} count={f.count} />
                    <span className="min-w-0 flex-1 leading-tight text-foreground">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-[11px]">{f.label}</span>
                        {f.severity === "fixed" && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                            <Sparkles className="h-2.5 w-2.5" /> auto-fixed
                          </span>
                        )}
                      </span>
                      {f.hint && f.count > 0 && f.severity === "warn" && (
                        <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground">
                          {f.hint}
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    {position && (
                      <span className="text-[9px] tabular-nums text-muted-foreground">
                        {position}
                      </span>
                    )}
                    {jumpable && (
                      <Crosshair className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    )}
                    <span
                      className={`tabular-nums text-[11px] font-semibold ${
                        f.severity === "warn" && f.count > 0
                          ? "text-amber-600"
                          : f.severity === "fixed"
                            ? "text-emerald-600 line-through decoration-emerald-600/60 dark:text-emerald-400"
                            : "text-muted-foreground"
                      }`}
                    >
                      {f.count.toLocaleString()}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function SeverityIcon({ severity, count }: { severity: Severity; count: number }) {
  if (severity === "info") return <Info className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />;
  if (severity === "warn" && count > 0)
    return <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />;
  return <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500/70" />;
}
