import { useMemo } from "react";
import { useEditor } from "@/store/editor";
import type { Block, ParagraphBlock, ParagraphRules } from "@/lib/types";
import { cn } from "@/lib/utils";

type RuleKey = Exclude<keyof ParagraphRules, "multiSpaces">;

interface RuleDef {
  key: RuleKey;
  label: string;
  hint: string;
  /** Does the source paragraph contain something this rule would affect? */
  matches: (p: ParagraphBlock) => boolean;
}

const RULES: RuleDef[] = [
  {
    key: "smartQuotes",
    label: "Smart quotes",
    hint: "Straight quotes & apostrophes become curly.",
    matches: (p) => p.runs.some((r) => /['"]/.test(r.text)),
  },
  {
    key: "dashes",
    label: "Em dashes",
    hint: "“--” and “---” become em dashes.",
    matches: (p) => p.runs.some((r) => /--/.test(r.text)),
  },
  {
    key: "trimTrailing",
    label: "Trim trailing spaces",
    hint: "Strip whitespace at the end of each paragraph.",
    matches: (p) => p.runs.some((r) => /[ \t]+$/.test(r.text)),
  },
  {
    key: "tabsToMargin",
    label: "Tabs → indent",
    hint: "Leading tabs and first-line indents become paragraph margins.",
    matches: (p) => p.leadingTabs > 0 || !!p.firstLineIndent,
  },
  {
    key: "softToHard",
    label: "Soft → hard breaks",
    hint: "Split soft line breaks into separate paragraphs.",
    matches: (p) => p.hasSoftBreaks,
  },
  {
    key: "pageBreakBefore",
    label: "Section → page break",
    hint: "Promote Word section breaks to clean page breaks.",
    matches: (p) => !!p.sectionBreakBefore,
  },
];

function eachParagraph(blocks: Block[]): ParagraphBlock[] {
  const out: ParagraphBlock[] = [];
  for (const b of blocks) {
    if (b.kind === "paragraph") out.push(b);
    else if (b.kind === "table")
      for (const row of b.rows) for (const c of row) out.push(...c.paragraphs);
  }
  return out;
}

export function CleanupBar() {
  const blocks = useEditor((s) => s.doc?.blocks);
  const applyDocCleanup = useEditor((s) => s.applyDocCleanup);
  const applyDocMultiSpaces = useEditor((s) => s.applyDocMultiSpaces);

  const { paragraphs, multiSpaceMode, multiSpaceMatches } = useMemo(() => {
    const ps = blocks ? eachParagraph(blocks) : [];
    const modes = new Set(ps.map((p) => p.rules.multiSpaces));
    const mode = modes.size === 1 ? [...modes][0] : "mixed";
    const matches = ps.filter((p) => p.hasMultiSpaces).length;
    return { paragraphs: ps, multiSpaceMode: mode, multiSpaceMatches: matches };
  }, [blocks]);

  if (!blocks) return null;

  return (
    <div className="space-y-1 px-2 py-2">
      <p className="px-1 pb-1 text-[10px] leading-relaxed text-muted-foreground">
        Toggle a rule to apply it across the whole document. Counts show how many paragraphs are affected.
      </p>
      {RULES.map((r) => {
        const matchCount = paragraphs.filter(r.matches).length;
        const onCount = paragraphs.filter((p) => p.rules[r.key]).length;
        const allOn = paragraphs.length > 0 && onCount === paragraphs.length;
        return (
          <RuleSwitch
            key={r.key}
            label={r.label}
            hint={r.hint}
            on={allOn}
            count={matchCount}
            mixed={onCount > 0 && !allOn}
            onChange={(v) => applyDocCleanup([r.key], v)}
          />
        );
      })}

      <div className="mt-2 rounded-md border border-border bg-background px-2.5 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-foreground">Multiple spaces</div>
            <div className="truncate text-[10px] text-muted-foreground" title="Convert runs of spaces to an en or em space, or leave them.">
              {multiSpaceMatches} affected
            </div>
          </div>
          <div className="flex shrink-0 overflow-hidden rounded-md border border-border">
            {(["none", "en", "em"] as const).map((v) => (
              <button
                key={v}
                onClick={() => applyDocMultiSpaces(v)}
                className={cn(
                  "px-2 py-1 text-[10px] font-medium transition",
                  multiSpaceMode === v
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-accent",
                )}
              >
                {v === "none" ? "off" : v}
              </button>
            ))}
          </div>
        </div>
        {multiSpaceMode === "mixed" && (
          <div className="mt-1 text-[10px] text-amber-600 dark:text-amber-400">
            Mixed across paragraphs — pick one to unify.
          </div>
        )}
      </div>
    </div>
  );
}

function RuleSwitch({
  label,
  hint,
  on,
  mixed,
  count,
  onChange,
}: {
  label: string;
  hint: string;
  on: boolean;
  mixed: boolean;
  count: number;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      title={hint}
      className="flex w-full items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 text-left hover:border-primary"
    >
      <span
        className={cn(
          "relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition",
          on ? "bg-primary" : mixed ? "bg-amber-500/60" : "bg-muted",
        )}
      >
        <span
          className={cn(
            "inline-block h-3 w-3 transform rounded-full bg-background shadow transition",
            on ? "translate-x-3.5" : mixed ? "translate-x-2" : "translate-x-0.5",
          )}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[11px] font-semibold text-foreground">{label}</span>
        <span className="block truncate text-[10px] text-muted-foreground">{hint}</span>
      </span>
      <span
        className={cn(
          "shrink-0 rounded px-1.5 py-0.5 text-[10px] tabular-nums",
          count === 0 ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary",
        )}
      >
        {count}
      </span>
    </button>
  );
}
