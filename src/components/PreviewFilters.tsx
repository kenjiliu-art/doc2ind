import { cn } from "@/lib/utils";
import type { PreviewFilter } from "./LivePreview";

const FILTER_LABELS: Array<{ key: PreviewFilter; label: string; shortcut: string }> = [
  { key: "all", label: "All", shortcut: "1" },
  { key: "warnings", label: "Warnings", shortcut: "2" },
  { key: "changed", label: "Changed", shortcut: "3" },
  { key: "selected", label: "Selected", shortcut: "4" },
  { key: "headings", label: "Headings", shortcut: "5" },
  { key: "unstyled", label: "Unstyled", shortcut: "6" },
];

interface Props {
  filter: PreviewFilter;
  onChange: (f: PreviewFilter) => void;
}

export function PreviewFilters({ filter, onChange }: Props) {
  return (
    <div className="sticky top-0 z-10 border-b border-border bg-sidebar/95 px-3 pb-3 pt-2 backdrop-blur">
      <div className="flex flex-wrap items-center gap-1">
        {FILTER_LABELS.map((f) => (
          <button
            key={f.key}
            onClick={() => onChange(f.key)}
            title={`${f.label} — press ${f.shortcut}`}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition",
              filter === f.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:bg-muted",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground/70">
        Filter shortcuts: 1–6 select filters
      </p>
    </div>
  );
}
