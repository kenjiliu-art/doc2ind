import { useMemo, useState } from "react";
import { useEditor } from "@/store/editor";
import type { Block, ParagraphBlock } from "@/lib/types";
import { Pencil, Check, X } from "lucide-react";

function walk(blocks: Block[], fn: (p: ParagraphBlock) => void) {
  for (const b of blocks) {
    if (b.kind === "paragraph") fn(b);
    else b.rows.forEach((r) => r.forEach((c) => c.paragraphs.forEach(fn)));
  }
}

export function RenameStylesPanel() {
  const doc = useEditor((s) => s.doc);
  const renameStyle = useEditor((s) => s.renameStyle);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    if (doc) walk(doc.blocks, (p) => m.set(p.style, (m.get(p.style) ?? 0) + 1));
    return m;
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
    if (doc.paragraphStyles.some((s) => s.name === next)) {
      setError(`"${next}" already exists`);
      return;
    }
    renameStyle(oldName, next);
    setEditing(null);
    setError(null);
  };

  return (
    <div className="px-3 pb-3 text-xs">

      <p className="mb-2 px-1 text-[10px] leading-snug text-muted-foreground">
        Rename to match your InDesign style names. Renames cascade to every
        paragraph using the style.
      </p>
      <ul className="space-y-1">
        {doc.paragraphStyles.map((s) => {
          const used = counts.get(s.name) ?? 0;
          const isEditing = editing === s.name;
          return (
            <li
              key={s.name}
              className="flex items-center gap-1.5 rounded border border-border bg-background px-2 py-1"
            >
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
                      if (e.key === "Enter") commit(s.name);
                      if (e.key === "Escape") {
                        setEditing(null);
                        setError(null);
                      }
                    }}
                    className="flex-1 rounded border border-border bg-background px-1.5 py-0.5 text-[11px]"
                  />
                  <button
                    onClick={() => commit(s.name)}
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
                    className="flex-1 truncate font-semibold text-foreground"
                    title={s.name}
                  >
                    {s.name}
                  </span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {used}¶
                  </span>
                  <button
                    onClick={() => startEdit(s.name)}
                    className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                    title="Rename style"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                </>
              )}
            </li>
          );
        })}
      </ul>
      {error && (
        <p className="mt-1.5 px-1 text-[10px] text-destructive">{error}</p>
      )}
    </div>
  );
}
