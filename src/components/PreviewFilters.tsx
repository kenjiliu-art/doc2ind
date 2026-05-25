import { cn } from "@/lib/utils";
import type { PreviewFilter } from "./LivePreview";

const FILTER_LABELS: Array<{ key: PreviewFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "warnings", label: "Warnings" },
  { key: "changed", label: "Changed" },
  { key: "selected", label: "Selected" },
  { key: "headings", label: "Headings" },
  { key: "unstyled", label: "Unstyled" },
];

interface Props {
  filter: PreviewFilter;
  onChange: (f: PreviewFilter) => void;
}

export function PreviewFilters({ filter, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-1 px-3 pb-3">
      {FILTER_LABELS.map((f) => (
        <button
          key={f.key}
          onClick={() => onChange(f.key)}
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
  );
}
