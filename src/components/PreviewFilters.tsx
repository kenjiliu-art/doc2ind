import { cn } from "@/lib/utils";
import type { PreviewFilter } from "./LivePreview";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HelpCircle } from "lucide-react";

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
  showHiddenChars: boolean;
  onToggleHiddenChars: () => void;
}

export function PreviewFilters({ filter, onChange, showHiddenChars, onToggleHiddenChars }: Props) {
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
      <div className="mt-2 flex items-center justify-between gap-2">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={showHiddenChars}
            onChange={onToggleHiddenChars}
            className="h-3.5 w-3.5 rounded border-border text-primary accent-primary"
          />
          <span className="text-[11px] text-muted-foreground">
            Show hidden characters <span className="text-muted-foreground/60">(H)</span>
          </span>
        </label>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Hidden characters legend"
              className="rounded p-0.5 text-muted-foreground/70 hover:bg-accent/40 hover:text-foreground"
            >
              <HelpCircle className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="right" align="end" className="w-56 p-3 text-[11px]">
            <p className="mb-2 font-semibold text-foreground">Hidden characters</p>
            <ul className="space-y-1.5 text-muted-foreground">
              <li className="flex items-center justify-between">
                <span className="font-mono text-primary">·</span>
                <span>Space</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="font-mono text-primary">→</span>
                <span>Tab</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="font-mono text-primary">↵</span>
                <span>Soft line break</span>
              </li>
            </ul>
            <p className="mt-2 text-[10px] text-muted-foreground/70">
              Filter shortcuts: 1–6 select filters · H toggles hidden chars.
            </p>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
