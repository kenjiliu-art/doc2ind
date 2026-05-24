import { useMemo } from "react";
import { useEditor } from "@/store/editor";
import { countIssues, healthScore, healthGrade } from "@/lib/health";
import { Activity } from "lucide-react";

/**
 * Compact color-coded Document Health badge.
 * Score is derived from pre-import diagnostics (raw baseline at parse time)
 * versus the current outstanding issue count.
 *
 * Tones:
 *  - good  (≥70):  emerald
 *  - ok    (40–69): amber
 *  - warn  (<40):  rose
 */
export function HealthBadge() {
  const doc = useEditor((s) => s.doc);
  const initial = useEditor((s) => s.initialIssues);

  const { score, current, grade } = useMemo(() => {
    if (!doc) return { score: 100, current: 0, grade: healthGrade(100) };
    const c = countIssues(doc);
    const s = healthScore(c, initial);
    return { score: s, current: c, grade: healthGrade(s) };
  }, [doc, initial]);

  if (!doc) return null;

  const tone =
    grade.tone === "good"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : grade.tone === "ok"
        ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
        : "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300";

  const dot =
    grade.tone === "good"
      ? "bg-emerald-500"
      : grade.tone === "ok"
        ? "bg-amber-500"
        : "bg-rose-500";

  const fixed = Math.max(0, initial - current);
  const title =
    initial > 0
      ? `Document Health ${score}/100 · ${grade.label} · ${fixed}/${initial} pre-import issues resolved`
      : `Document Health ${score}/100 · ${grade.label} · no issues at import`;

  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold tabular-nums transition-colors ${tone}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      <Activity className="h-3 w-3" />
      <span>{score}</span>
      <span className="hidden opacity-80 sm:inline">· {grade.label}</span>
    </span>
  );
}
