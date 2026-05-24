import { useMemo } from "react";
import { useEditor } from "@/store/editor";
import { countIssues } from "@/lib/health";
import { Sparkles } from "lucide-react";

interface Props {
  children: React.ReactNode;
  size?: number;
  stroke?: number;
}

/**
 * Wraps a button with a circular progress ring that fills as warnings are resolved.
 * The ring color shifts from rose → amber → emerald as the document gets cleaner.
 */
export function CleanSweepRing({ children, size = 52, stroke = 3.5 }: Props) {
  const doc = useEditor((s) => s.doc);
  const initial = useEditor((s) => s.initialIssues);

  const progress = useMemo(() => {
    if (!doc || initial === 0) return 100;
    const current = countIssues(doc);
    const resolved = Math.max(0, initial - current);
    return Math.min(100, Math.round((resolved / initial) * 100));
  }, [doc, initial]);

  if (!doc || initial === 0) {
    return <>{children}</>;
  }

  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - progress / 100);

  let colorClass = "stroke-rose-500";
  if (progress >= 70) colorClass = "stroke-emerald-500";
  else if (progress >= 40) colorClass = "stroke-amber-500";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="pointer-events-none absolute inset-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90"
        style={{ width: size, height: size }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-muted/60"
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
      {/* Inner content sits on top */}
      <div className="relative z-10 flex h-[calc(100%-6px)] w-[calc(100%-6px)] items-center justify-center">
        {children}
      </div>
    </div>
  );
}
