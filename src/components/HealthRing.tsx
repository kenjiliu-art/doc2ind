import { useMemo } from "react";
import { useEditor } from "@/store/editor";
import { countIssues, healthScore, healthGrade } from "@/lib/health";
import { Sparkles } from "lucide-react";

interface Props {
  /** Compact variant for mobile bottom sheet — smaller ring. */
  compact?: boolean;
}

/**
 * Document Health gauge: circular progress ring around a 0–100 score.
 * Clickable — scrolls/opens the diagnostics panel.
 */
export function HealthRing({ compact = false }: Props) {
  const doc = useEditor((s) => s.doc);
  const initial = useEditor((s) => s.initialIssues);

  const { score, current, grade } = useMemo(() => {
    if (!doc) return { score: 100, current: 0, grade: healthGrade(100) };
    const c = countIssues(doc);
    const s = healthScore(c, initial);
    return { score: s, current: c, grade: healthGrade(s) };
  }, [doc, initial]);

  if (!doc) return null;

  const size = compact ? 48 : 56;
  const stroke = compact ? 4 : 5;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - score / 100);

  const toneColor =
    grade.tone === "good"
      ? "stroke-emerald-500"
      : grade.tone === "ok"
        ? "stroke-amber-500"
        : "stroke-rose-500";
  const toneText =
    grade.tone === "good"
      ? "text-emerald-600 dark:text-emerald-400"
      : grade.tone === "ok"
        ? "text-amber-600 dark:text-amber-400"
        : "text-rose-600 dark:text-rose-400";

  const fixed = Math.max(0, initial - current);

  const handleClick = () => {
    window.dispatchEvent(new CustomEvent("open-diagnostics"));
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title="Open diagnostics"
      className="flex w-full items-center gap-3 rounded-lg border border-border bg-background/70 px-3 py-2 text-left transition hover:border-primary/40 hover:bg-background"
    >
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            className="stroke-muted"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            className={`${toneColor} transition-[stroke-dashoffset] duration-500 ease-out`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-display text-sm font-bold tabular-nums ${toneText}`}>
            {score}
          </span>
        </div>
      </div>
      <div className="min-w-0 flex-1 leading-tight">
        <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Sparkles className="h-3 w-3" />
          Health
        </div>
        <div className={`text-xs font-semibold ${toneText}`}>{grade.label}</div>
        <div className="mt-0.5 text-[10px] text-muted-foreground tabular-nums">
          {initial > 0
            ? `${fixed}/${initial} issues fixed`
            : "No issues detected at import"}
        </div>
      </div>
    </button>
  );
}
