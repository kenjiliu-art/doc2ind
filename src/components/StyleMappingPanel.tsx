import { useMemo } from "react";
import { useEditor } from "@/store/editor";
import type { Block, ParagraphBlock } from "@/lib/types";

interface SourceUsage {
  source: string; // resolved name or "(unstyled)"
  rawKey: string | null; // sourceStyle value, or null for unstyled
  count: number;
  chars: number;
  sample: string;
  /** Map of current style → count, for showing what it's mapped to now. */
  currentTargets: Map<string, number>;
}

const UNSTYLED_KEY = "__unstyled__";

function walk(blocks: Block[], fn: (p: ParagraphBlock) => void) {
  for (const b of blocks) {
    if (b.kind === "paragraph") fn(b);
    else b.rows.forEach((r) => r.forEach((c) => c.paragraphs.forEach(fn)));
  }
}

export function StyleMappingPanel() {
  const doc = useEditor((s) => s.doc);
  const mapSourceStyle = useEditor((s) => s.mapSourceStyle);

  const sources = useMemo<SourceUsage[]>(() => {
    if (!doc) return [];
    const map = new Map<string, SourceUsage>();
    walk(doc.blocks, (p) => {
      const key = p.sourceStyle ?? UNSTYLED_KEY;
      const label = p.sourceStyle ?? "(no source style)";
      const text = p.runs.map((r) => r.text).join("").trim();
      const cur = map.get(key);
      if (cur) {
        cur.count++;
        cur.chars += text.length;
        if (cur.sample.length < 60 && text)
          cur.sample = (cur.sample + " · " + text).slice(0, 60);
        cur.currentTargets.set(p.style, (cur.currentTargets.get(p.style) ?? 0) + 1);
      } else {
        map.set(key, {
          source: label,
          rawKey: p.sourceStyle ?? null,
          count: 1,
          chars: text.length,
          sample: text.slice(0, 60),
          currentTargets: new Map([[p.style, 1]]),
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [doc]);

  if (!doc) return null;

  return (
    <div className="px-3 py-3 text-xs">
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        Source style mapping{" "}
        <span className="ml-1 font-medium normal-case tracking-normal text-muted-foreground/70">
          ({sources.length})
        </span>
      </p>
      <p className="mb-2 px-1 text-[10px] leading-snug text-muted-foreground">
        Word styles found in this file. Remap each to one of your target paragraph
        styles, or discard the paragraphs entirely.
      </p>
      {sources.length === 0 ? (
        <p className="px-1 italic text-muted-foreground">No paragraphs.</p>
      ) : sources.length === 1 && sources[0].currentTargets.size === 1 ? (
        <p className="rounded border border-emerald-500/20 bg-emerald-500/5 px-2 py-1.5 text-[10px] leading-snug text-emerald-700 dark:text-emerald-400">
          Tidy — only one source style and it's mapped consistently.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {sources.map((s) => {
            const dominant = [...s.currentTargets.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
            const mixed = s.currentTargets.size > 1;
            return (
              <li
                key={s.rawKey ?? UNSTYLED_KEY}
                className="rounded border border-border bg-background px-2 py-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-semibold text-foreground" title={s.source}>
                    {s.source}
                  </span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {s.count}¶
                  </span>
                </div>
                {s.sample && (
                  <p className="mt-0.5 truncate text-[10px] italic text-muted-foreground" title={s.sample}>
                    {s.sample}
                  </p>
                )}
                <div className="mt-1.5 flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">→</span>
                  <select
                    value={mixed ? "__mixed" : (dominant ?? "Body")}
                    onChange={(e) => {
                      if (s.rawKey === null) return;
                      mapSourceStyle(s.rawKey, e.target.value as never);
                    }}
                    disabled={s.rawKey === null}
                    className="flex-1 rounded border border-border bg-background px-1.5 py-0.5 text-[11px]"
                    title={s.rawKey === null ? "Unstyled paragraphs can't be bulk-remapped" : "Remap all paragraphs with this source style"}
                  >
                    {mixed && (
                      <option value="__mixed" disabled>
                        — Mixed ({s.currentTargets.size} targets) —
                      </option>
                    )}
                    {doc.paragraphStyles.map((ps) => (
                      <option key={ps.name} value={ps.name}>
                        {ps.name}
                      </option>
                    ))}
                    <option value="__discard">⌫ Discard paragraphs</option>
                  </select>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
