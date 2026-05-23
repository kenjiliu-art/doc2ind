import { useEditor } from "@/store/editor";
import type { StyleDef } from "@/lib/types";
import { useState } from "react";

export function StylePanel() {
  const doc = useEditor((s) => s.doc);
  const updateStyleDef = useEditor((s) => s.updateStyleDef);
  const renameStyle = useEditor((s) => s.renameStyle);
  const replaceFont = useEditor((s) => s.replaceFont);
  const normalizeFonts = useEditor((s) => s.normalizeFonts);
  const [normalizeTarget, setNormalizeTarget] = useState("Georgia");

  if (!doc) return null;

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-3 text-sm font-semibold">
        Paragraph styles
      </div>
      <div className="max-h-[calc(100vh-200px)] divide-y divide-border overflow-y-auto">
        {doc.paragraphStyles.map((s) => (
          <StyleEditor
            key={s.name}
            style={s}
            onChange={(patch) => updateStyleDef(s.name, patch)}
            onRename={(newName) => renameStyle(s.name, newName)}
          />
        ))}
      </div>
      <div className="border-t border-border px-4 py-3 text-sm font-semibold">
        Character styles
      </div>
      <div className="px-4 py-3 text-xs text-muted-foreground">
        {doc.charStyles.map((c) => c.name).join(", ")}
      </div>
    </div>
  );
}

interface SEProps {
  style: StyleDef;
  onChange: (patch: Partial<StyleDef>) => void;
  onRename: (newName: string) => void;
}

function StyleEditor({ style, onChange, onRename }: SEProps) {
  return (
    <details className="px-4 py-2">
      <summary className="cursor-pointer text-sm font-medium">{style.name}</summary>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        <label className="col-span-2 flex flex-col gap-1">
          <span className="text-muted-foreground">Name</span>
          <input
            defaultValue={style.name}
            onBlur={(e) => e.target.value && e.target.value !== style.name && onRename(e.target.value)}
            className="rounded border border-border bg-background px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground">Font</span>
          <input
            value={style.font ?? ""}
            onChange={(e) => onChange({ font: e.target.value })}
            className="rounded border border-border bg-background px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground">Size (pt)</span>
          <input
            type="number"
            value={style.size ? style.size / 2 : ""}
            onChange={(e) => onChange({ size: Number(e.target.value) * 2 })}
            className="rounded border border-border bg-background px-2 py-1"
          />
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={!!style.bold}
            onChange={(e) => onChange({ bold: e.target.checked })}
          />
          Bold
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={!!style.italic}
            onChange={(e) => onChange({ italic: e.target.checked })}
          />
          Italic
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={style.hyphenation}
            onChange={(e) => onChange({ hyphenation: e.target.checked })}
          />
          Hyphenation
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={style.keepWithNext}
            onChange={(e) => onChange({ keepWithNext: e.target.checked })}
          />
          Keep w/ next
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground">Left indent (twips)</span>
          <input
            type="number"
            value={style.leftIndent ?? 0}
            onChange={(e) => onChange({ leftIndent: Number(e.target.value) })}
            className="rounded border border-border bg-background px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground">First-line (twips)</span>
          <input
            type="number"
            value={style.firstLineIndent ?? 0}
            onChange={(e) => onChange({ firstLineIndent: Number(e.target.value) })}
            className="rounded border border-border bg-background px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground">Space before</span>
          <input
            type="number"
            value={style.spaceBefore ?? 0}
            onChange={(e) => onChange({ spaceBefore: Number(e.target.value) })}
            className="rounded border border-border bg-background px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground">Space after</span>
          <input
            type="number"
            value={style.spaceAfter ?? 0}
            onChange={(e) => onChange({ spaceAfter: Number(e.target.value) })}
            className="rounded border border-border bg-background px-2 py-1"
          />
        </label>
      </div>
    </details>
  );
}
