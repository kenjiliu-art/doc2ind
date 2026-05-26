import { useMemo, useState } from "react";
import { useEditor } from "@/store/editor";
import type { Block, CharStyleDef, ParagraphBlock } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Pencil, Check, X } from "lucide-react";

interface Usage {
  def: CharStyleDef | { name: string };
  count: number;
  chars: number;
  sample: string;
}

function walkParagraphs(blocks: Block[], fn: (p: ParagraphBlock) => void) {
  for (const b of blocks) {
    if (b.kind === "paragraph") fn(b);
    else b.rows.forEach((r) => r.forEach((c) => c.paragraphs.forEach(fn)));
  }
}

export function CharStylesPanel() {
  const doc = useEditor((s) => s.doc);
  const renameCharStyle = useEditor((s) => s.renameCharStyle);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const usage = useMemo<Usage[]>(() => {
    if (!doc) return [];
    const map = new Map<string, Usage>();
    const defs = new Map(doc.charStyles.map((c) => [c.name, c]));
    walkParagraphs(doc.blocks, (p) => {
      for (const r of p.runs) {
        if (!r.charStyle || !r.text || r.text === "\n") continue;
        const key = r.charStyle;
        const cur = map.get(key);
        if (cur) {
          cur.count += 1;
          cur.chars += r.text.length;
          if (cur.sample.length < 40) cur.sample = (cur.sample + " " + r.text).trim().slice(0, 40);
        } else {
          map.set(key, {
            def: defs.get(key) ?? { name: key },
            count: 1,
            chars: r.text.length,
            sample: r.text.slice(0, 40),
          });
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => b.chars - a.chars);
  }, [doc]);

  if (!doc) return null;

  const startEdit = (name: string) => {
    setEditing(name);
    setDraft(name);
    setError(null);
  };

  const commit = (oldName: string) => {
    const next = draft.trim();
    if (!next || next === oldName) {
      setEditing(null);
      setError(null);
      return;
    }
    if (doc.charStyles.some((c) => c.name === next) || usage.some((u) => u.def.name === next)) {
      setError(`"${next}" already exists`);
      return;
    }
    renameCharStyle(oldName, next);
    setEditing(null);
    setError(null);
  };

  return (
    <div className="px-3 pb-3 text-xs">
      {usage.length === 0 ? (
        <p className="px-1 text-[11px] italic text-muted-foreground">
          No inline character styles in this document.
        </p>
      ) : (
        <ul className="space-y-1">
          {usage.map((u) => {
            const isEditing = editing === u.def.name;
            return (
              <li
                key={u.def.name}
                className="rounded border border-border bg-background px-2 py-1.5"
                title={isEditing ? undefined : u.sample}
              >
                <div className="flex items-center justify-between gap-2">
                  {isEditing ? (
                    <>
                      <input
                        autoFocus
                        value={draft}
                        onChange={(e) => {
                          setDraft(e.target.value);
                          setError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commit(u.def.name);
                          if (e.key === "Escape") {
                            setEditing(null);
                            setError(null);
                          }
                        }}
                        className="flex-1 rounded border border-border bg-background px-1.5 py-0.5 text-[11px]"
                      />
                      <button
                        onClick={() => commit(u.def.name)}
                        className="rounded p-0.5 text-emerald-600 hover:bg-accent"
                        title="Save"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => {
                          setEditing(null);
                          setError(null);
                        }}
                        className="rounded p-0.5 text-muted-foreground hover:bg-accent"
                        title="Cancel"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span
                        className={cn(
                          "flex-1 truncate text-[11px] font-semibold text-foreground",
                          "def" in u && (u.def as CharStyleDef).bold && "font-bold",
                          "def" in u && (u.def as CharStyleDef).italic && "italic",
                          "def" in u && (u.def as CharStyleDef).underline && "underline",
                        )}
                      >
                        {u.def.name}
                      </span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {u.count}× · {u.chars} chars
                      </span>
                      <button
                        onClick={() => startEdit(u.def.name)}
                        className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                        title="Rename character style"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    </>
                  )}
                </div>
                {!isEditing && <FormatBadges def={u.def as CharStyleDef} />}
              </li>
            );
          })}
        </ul>
      )}
      {error && (
        <p className="mt-1.5 px-1 text-[10px] text-destructive">{error}</p>
      )}
    </div>
  );
}

function FormatBadges({ def }: { def: CharStyleDef }) {
  const items: string[] = [];
  if (def.bold) items.push("Bold");
  if (def.italic) items.push("Italic");
  if (def.underline) items.push("Underline");
  if (def.smallCaps) items.push("Small caps");
  if (def.superscript) items.push("Superscript");
  if (def.subscript) items.push("Subscript");
  if (items.length === 0) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {items.map((i) => (
        <span
          key={i}
          className="rounded bg-muted px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-muted-foreground"
        >
          {i}
        </span>
      ))}
    </div>
  );
}
