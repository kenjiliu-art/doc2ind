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
        Fonts in document
      </div>
      <div className="space-y-2 px-4 py-3 text-xs">
        {doc.detectedFonts.length === 0 && (
          <div className="text-muted-foreground">No direct font formatting detected.</div>
        )}
        {doc.detectedFonts.map((f) => (
          <div key={f.name} className="flex items-center gap-2">
            <span className="flex-1 truncate" title={f.name}>
              {f.name}
            </span>
            <span className="text-muted-foreground">{f.count}</span>
            <input
              defaultValue={f.name}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== f.name) replaceFont(f.name, v);
              }}
              className="w-24 rounded border border-border bg-background px-1.5 py-0.5"
              title="Rename / replace this font"
            />
          </div>
        ))}
        {doc.detectedFonts.length > 1 && (
          <div className="mt-2 flex items-center gap-2 border-t border-border pt-2">
            <span className="text-muted-foreground">Normalize all →</span>
            <input
              value={normalizeTarget}
              onChange={(e) => setNormalizeTarget(e.target.value)}
              className="w-24 rounded border border-border bg-background px-1.5 py-0.5"
            />
            <button
              onClick={() => normalizeTarget && normalizeFonts(normalizeTarget)}
              className="rounded border border-border bg-background px-2 py-0.5 hover:bg-accent"
            >
              Apply
            </button>
          </div>
        )}
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
  const isHeading = /heading|title|h[1-6]/i.test(style.name);
  return (
    <details className="px-4 py-2" open={isHeading}>
      <summary className="cursor-pointer text-sm font-medium">
        {style.name}
        {isHeading && (
          <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-primary">
            heading
          </span>
        )}
      </summary>
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
          <span className="text-muted-foreground">Left indent (pt)</span>
          <input
            type="number"
            value={style.leftIndent ? style.leftIndent / 20 : 0}
            onChange={(e) => onChange({ leftIndent: Number(e.target.value) * 20 })}
            className="rounded border border-border bg-background px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground">First-line (pt)</span>
          <input
            type="number"
            value={style.firstLineIndent ? style.firstLineIndent / 20 : 0}
            onChange={(e) => onChange({ firstLineIndent: Number(e.target.value) * 20 })}
            className="rounded border border-border bg-background px-2 py-1"
          />
        </label>

        <div
          className={`col-span-2 mt-2 grid grid-cols-2 gap-2 rounded-md p-2 ${
            isHeading ? "bg-primary/5 ring-1 ring-primary/20" : "bg-muted/40"
          }`}
        >
          <div className="col-span-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Spacing {isHeading && "(headings often need extra room)"}
            </span>
            {isHeading && (
              <div className="flex gap-1">
                {[
                  { label: "Tight", b: 12, a: 6 },
                  { label: "Default", b: 18, a: 6 },
                  { label: "Airy", b: 28, a: 12 },
                ].map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => onChange({ spaceBefore: p.b * 20, spaceAfter: p.a * 20 })}
                    className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] hover:bg-accent"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-muted-foreground">Space before (pt)</span>
            <input
              type="number"
              value={style.spaceBefore ? style.spaceBefore / 20 : 0}
              onChange={(e) => onChange({ spaceBefore: Number(e.target.value) * 20 })}
              className="rounded border border-border bg-background px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-muted-foreground">Space after (pt)</span>
            <input
              type="number"
              value={style.spaceAfter ? style.spaceAfter / 20 : 0}
              onChange={(e) => onChange({ spaceAfter: Number(e.target.value) * 20 })}
              className="rounded border border-border bg-background px-2 py-1"
            />
          </label>
        </div>
      </div>
    </details>
  );
}
