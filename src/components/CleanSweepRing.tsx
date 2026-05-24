import { useMemo } from "react";
import { useEditor } from "@/store/editor";
import { countIssues } from "@/lib/health";

interface Props {
  children: React.ReactNode;
  size?: number;
  stroke?: number;
}

/**
 * Wraps an icon or small element with a circular progress ring that fills as
 * warnings are resolved. Color shifts rose → amber → emerald.
 */
export function CleanSweepRing({ children, size = 28, stroke = 2.5 }: Props) {
  const doc = useEditor((s) => s.doc);
  const initial = useEditor((s) => s.initialIssues);

  const progress = useMemo(() => {
    if (!doc || initial === 0) return 100;
    const current = countIssues(doc);
    const resolved = Math.max(0, initial - current);
    return Math.min(100, Math.round((resolved / initial) * 100));
  }, [doc, initial]);

  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - progress / 100);

  let colorClass = "stroke-rose-500";
  if (progress >= 70) colorClass = "stroke-emerald-500";
  else if (progress >= 40) colorClass = "stroke-amber-500";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-muted/50"
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
          className={`${colorClass} transition-[stroke-dashoffset] duration-700 ease-out`}
        />
      </svg>
      <span className="relative z-10 flex items-center justify-center">{children}</span>
    </div>
  );
}
