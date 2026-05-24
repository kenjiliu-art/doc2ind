import { useMemo, useState } from "react";
import { useEditor } from "@/store/editor";
import type { Block, CharStyleDef, StyleDef } from "@/lib/types";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function StylePanel() {
  const doc = useEditor((s) => s.doc);
  const updateStyleDef = useEditor((s) => s.updateStyleDef);
  const updateCharStyleDef = useEditor((s) => s.updateCharStyleDef);
  const renameStyle = useEditor((s) => s.renameStyle);
  const replaceFont = useEditor((s) => s.replaceFont);
  const normalizeFonts = useEditor((s) => s.normalizeFonts);
  const [normalizeTarget, setNormalizeTarget] = useState("Georgia");

  const { paraUsage, charUsage } = useMemo(
    () => (doc ? countUsage(doc.blocks) : { paraUsage: new Map(), charUsage: new Map() }),
    [doc],
  );

  if (!doc) return null;

  return (
    <div className="rounded-lg border border-border bg-card">
      <SectionHeader title="Paragraph styles" count={doc.paragraphStyles.length} />
      <div className="max-h-[40vh] divide-y divide-border overflow-y-auto">
        {doc.paragraphStyles.map((s) => (
          <ParaStyleRow
            key={s.name}
            style={s}
            usage={paraUsage.get(s.name) ?? 0}
            onChange={(patch) => updateStyleDef(s.name, patch)}
            onRename={(newName) => renameStyle(s.name, newName)}
          />
        ))}
      </div>

      <SectionHeader title="Character styles" count={doc.charStyles.length} />
      <div className="max-h-[30vh] divide-y divide-border overflow-y-auto">
        {doc.charStyles.length === 0 && (
          <div className="px-3 py-3 text-xs text-muted-foreground">None detected.</div>
        )}
        {doc.charStyles.map((c) => (
          <CharStyleRow
            key={c.name}
            style={c}
            usage={charUsage.get(c.name) ?? 0}
            onChange={(patch) => updateCharStyleDef(c.name, patch)}
          />
        ))}
      </div>

      <SectionHeader title="Fonts in document" count={doc.detectedFonts.length} />
      <div className="space-y-2 px-3 py-3 text-xs">
        {doc.detectedFonts.length === 0 && (
          <div className="text-muted-foreground">No direct font formatting detected.</div>
        )}
        {doc.detectedFonts.map((f) => (
          <div key={f.name} className="flex items-center gap-2">
            <span className="flex-1 truncate" title={f.name} style={{ fontFamily: f.name }}>
              {f.name}
            </span>
            <span className="tabular-nums text-muted-foreground">{f.count}</span>
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
    </div>
  );
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center justify-between border-b border-border bg-muted/30 px-3 py-2">
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {title}
      </span>
      <span className="rounded bg-background px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground">
        {count}
      </span>
    </div>
  );
}

function countUsage(blocks: Block[]) {
  const paraUsage = new Map<string, number>();
  const charUsage = new Map<string, number>();
  const visit = (p: import("@/lib/types").ParagraphBlock) => {
    paraUsage.set(p.style, (paraUsage.get(p.style) ?? 0) + 1);
    for (const r of p.runs) {
      if (r.charStyle) charUsage.set(r.charStyle, (charUsage.get(r.charStyle) ?? 0) + 1);
    }
  };
  for (const b of blocks) {
    if (b.kind === "paragraph") visit(b);
    else if (b.kind === "table") {
      for (const row of b.rows) for (const cell of row) for (const p of cell.paragraphs) visit(p);
    }
  }
  return { paraUsage, charUsage };
}

function describeStyle(s: StyleDef): string {
  const parts: string[] = [];
  if (s.font) parts.push(s.font);
  const weight = s.bold ? "Bold" : "";
  const italic = s.italic ? "Italic" : "";
  const wi = [weight, italic].filter(Boolean).join(" ");
  if (wi) parts.push(wi);
  if (s.size) {
    const pt = s.size / 2;
    const lead = s.lineSpacing ? `/${(s.lineSpacing / 20).toFixed(0)}` : "";
    parts.push(`${pt}${lead}pt`);
  }
  if (s.alignment && s.alignment !== "left") parts.push(s.alignment);
  if (s.leftIndent) parts.push(`indent ${(s.leftIndent / 20).toFixed(0)}pt`);
  if (s.firstLineIndent) parts.push(`first ${(s.firstLineIndent / 20).toFixed(0)}pt`);
  if (s.spaceBefore || s.spaceAfter) {
    parts.push(`${((s.spaceBefore ?? 0) / 20).toFixed(0)}/${((s.spaceAfter ?? 0) / 20).toFixed(0)}pt`);
  }
  return parts.join(" · ") || "—";
}

function describeChar(c: CharStyleDef): string {
  const parts: string[] = [];
  if (c.bold) parts.push("Bold");
  if (c.italic) parts.push("Italic");
  if (c.underline) parts.push("Underline");
  if (c.smallCaps) parts.push("Small caps");
  if (c.superscript) parts.push("Superscript");
  if (c.subscript) parts.push("Subscript");
  return parts.join(" · ") || "no formatting";
}

function sampleStyle(s: StyleDef): React.CSSProperties {
  return {
    fontFamily: s.font || undefined,
    fontSize: s.size ? `${Math.min(s.size / 2, 18)}px` : undefined,
    fontWeight: s.bold ? 700 : 400,
    fontStyle: s.italic ? "italic" : undefined,
    textAlign: s.alignment,
  };
}

function sampleCharStyle(c: CharStyleDef): React.CSSProperties {
  return {
    fontWeight: c.bold ? 700 : undefined,
    fontStyle: c.italic ? "italic" : undefined,
    textDecoration: c.underline ? "underline" : undefined,
    fontVariant: c.smallCaps ? "small-caps" : undefined,
    verticalAlign: c.superscript ? "super" : c.subscript ? "sub" : undefined,
    fontSize: c.superscript || c.subscript ? "0.75em" : undefined,
  };
}

function StyleRowShell({
  open,
  onToggle,
  name,
  usage,
  badge,
  summary,
  sample,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  name: string;
  usage: number;
  badge?: React.ReactNode;
  summary: string;
  sample: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="group flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-accent/40"
      >
        <ChevronRight
          className={cn(
            "mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-90",
          )}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-xs font-semibold text-foreground">{name}</span>
            {badge}
            <span className="ml-auto shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground">
              {usage}
            </span>
          </div>
          <div className="mt-0.5 truncate text-[10px] text-muted-foreground">{summary}</div>
          <div className="mt-1 truncate text-xs text-foreground/80">{sample}</div>
        </div>
      </button>
      {open && <div className="border-t border-border bg-muted/20 px-3 py-3">{children}</div>}
    </div>
  );
}

function ParaStyleRow({
  style,
  usage,
  onChange,
  onRename,
}: {
  style: StyleDef;
  usage: number;
  onChange: (p: Partial<StyleDef>) => void;
  onRename: (n: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const isHeading = /heading|title|h[1-6]/i.test(style.name);
  return (
    <StyleRowShell
      open={open}
      onToggle={() => setOpen((v) => !v)}
      name={style.name}
      usage={usage}
      badge={
        isHeading ? (
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-primary">
            heading
          </span>
        ) : null
      }
      summary={describeStyle(style)}
      sample={
        <span style={sampleStyle(style)}>
          The quick brown fox jumps over the lazy dog
        </span>
      }
    >
      <div className="grid grid-cols-2 gap-2 text-xs">
        <Field label="Name" span={2}>
          <input
            defaultValue={style.name}
            onBlur={(e) => e.target.value && e.target.value !== style.name && onRename(e.target.value)}
            className="w-full rounded border border-border bg-background px-2 py-1"
          />
        </Field>
        <Field label="Font">
          <input
            value={style.font ?? ""}
            onChange={(e) => onChange({ font: e.target.value })}
            className="w-full rounded border border-border bg-background px-2 py-1"
          />
        </Field>
        <Field label="Size (pt)">
          <input
            type="number"
            value={style.size ? style.size / 2 : ""}
            onChange={(e) => onChange({ size: Number(e.target.value) * 2 })}
            className="w-full rounded border border-border bg-background px-2 py-1"
          />
        </Field>
        <Toggle checked={!!style.bold} onChange={(v) => onChange({ bold: v })} label="Bold" />
        <Toggle checked={!!style.italic} onChange={(v) => onChange({ italic: v })} label="Italic" />
        <Toggle checked={style.hyphenation} onChange={(v) => onChange({ hyphenation: v })} label="Hyphenation" />
        <Toggle checked={style.keepWithNext} onChange={(v) => onChange({ keepWithNext: v })} label="Keep w/ next" />
        <Field label="Left indent (pt)">
          <input
            type="number"
            value={style.leftIndent ? style.leftIndent / 20 : 0}
            onChange={(e) => onChange({ leftIndent: Number(e.target.value) * 20 })}
            className="w-full rounded border border-border bg-background px-2 py-1"
          />
        </Field>
        <Field label="First-line (pt)">
          <input
            type="number"
            value={style.firstLineIndent ? style.firstLineIndent / 20 : 0}
            onChange={(e) => onChange({ firstLineIndent: Number(e.target.value) * 20 })}
            className="w-full rounded border border-border bg-background px-2 py-1"
          />
        </Field>
        <Field label="Space before (pt)">
          <input
            type="number"
            value={style.spaceBefore ? style.spaceBefore / 20 : 0}
            onChange={(e) => onChange({ spaceBefore: Number(e.target.value) * 20 })}
            className="w-full rounded border border-border bg-background px-2 py-1"
          />
        </Field>
        <Field label="Space after (pt)">
          <input
            type="number"
            value={style.spaceAfter ? style.spaceAfter / 20 : 0}
            onChange={(e) => onChange({ spaceAfter: Number(e.target.value) * 20 })}
            className="w-full rounded border border-border bg-background px-2 py-1"
          />
        </Field>
      </div>
    </StyleRowShell>
  );
}

function CharStyleRow({
  style,
  usage,
  onChange,
}: {
  style: CharStyleDef;
  usage: number;
  onChange: (p: Partial<CharStyleDef>) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <StyleRowShell
      open={open}
      onToggle={() => setOpen((v) => !v)}
      name={style.name}
      usage={usage}
      summary={describeChar(style)}
      sample={<span style={sampleCharStyle(style)}>The quick brown fox</span>}
    >
      <div className="grid grid-cols-2 gap-2 text-xs">
        <Toggle checked={!!style.bold} onChange={(v) => onChange({ bold: v })} label="Bold" />
        <Toggle checked={!!style.italic} onChange={(v) => onChange({ italic: v })} label="Italic" />
        <Toggle checked={!!style.underline} onChange={(v) => onChange({ underline: v })} label="Underline" />
        <Toggle checked={!!style.smallCaps} onChange={(v) => onChange({ smallCaps: v })} label="Small caps" />
        <Toggle checked={!!style.superscript} onChange={(v) => onChange({ superscript: v, subscript: v ? false : style.subscript })} label="Superscript" />
        <Toggle checked={!!style.subscript} onChange={(v) => onChange({ subscript: v, superscript: v ? false : style.superscript })} label="Subscript" />
      </div>
    </StyleRowShell>
  );
}

function Field({ label, span, children }: { label: string; span?: number; children: React.ReactNode }) {
  return (
    <label className={cn("flex flex-col gap-1", span === 2 && "col-span-2")}>
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-1.5">
      <input
        type="checkbox"
        className="h-3.5 w-3.5 accent-primary"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}
