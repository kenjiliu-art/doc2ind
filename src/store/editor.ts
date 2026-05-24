import { create } from "zustand";
import type {
  Block,
  CharStyleDef,
  ParagraphBlock,
  ParagraphRules,
  ParagraphStyle,
  ParsedDoc,
  StyleDef,
} from "@/lib/types";
import {
  stripUnusedStyles,
  collapseBlanksToSpacing,
  normalizeLists,
  closeOrphanRuns,
  sectionBreaksToPageBreaks,
  sanitizeStyleNames,
} from "@/lib/preflight";
import { useSettings, applyAutoSettingsToRules } from "@/store/settings";

export type PreflightAction =
  | "stripUnusedStyles"
  | "collapseBlanksToSpacing"
  | "normalizeLists"
  | "closeOrphanRuns"
  | "sectionBreaksToPageBreaks"
  | "sanitizeStyleNames";

interface EditorState {
  doc: ParsedDoc | null;
  selection: Set<string>;
  fileName: string;
  preflightHistory: Set<PreflightAction>;
  setDoc: (doc: ParsedDoc, fileName: string) => void;
  reset: () => void;
  updateParagraph: (id: string, patch: Partial<ParagraphBlock>) => void;
  updateParagraphRule: <K extends keyof ParagraphRules>(id: string, key: K, value: ParagraphRules[K]) => void;
  setStyle: (id: string, style: ParagraphStyle) => void;
  setText: (id: string, text: string) => void;
  toggleSelect: (id: string) => void;
  clearSelection: () => void;
  selectAll: () => void;
  bulkSetStyle: (style: ParagraphStyle) => void;
  bulkToggleRule: (key: keyof ParagraphRules, value: boolean) => void;
  updateStyleDef: (name: string, patch: Partial<StyleDef>) => void;
  renameStyle: (oldName: string, newName: string) => void;
  applyDocCleanup: (keys: Array<Exclude<keyof ParagraphRules, "multiSpaces">>, value: boolean) => void;
  bulkSetMultiSpaces: (value: "none" | "en" | "em") => void;
  applyDocMultiSpaces: (value: "none" | "en" | "em") => void;
  replaceFont: (from: string, to: string) => void;
  normalizeFonts: (to: string) => void;
  revertParagraphField: (id: string, field: "style" | "runs" | keyof ParagraphRules) => void;
  revertParagraph: (id: string) => void;
  applyCharStyleRange: (id: string, start: number, end: number, charStyle: string | null) => void;
  runPreflight: (action: PreflightAction) => void;
}

function mapParagraphs(blocks: Block[], fn: (p: ParagraphBlock) => ParagraphBlock): Block[] {
  return blocks.map((b) => {
    if (b.kind === "paragraph") return fn(b);
    return {
      ...b,
      rows: b.rows.map((row) =>
        row.map((cell) => ({
          ...cell,
          paragraphs: cell.paragraphs.map(fn),
        })),
      ),
    };
  });
}

function findParagraph(blocks: Block[], id: string): ParagraphBlock | undefined {
  for (const b of blocks) {
    if (b.kind === "paragraph" && b.id === id) return b;
    if (b.kind === "table") {
      for (const row of b.rows)
        for (const cell of row)
          for (const p of cell.paragraphs) if (p.id === id) return p;
    }
  }
  return undefined;
}

export const useEditor = create<EditorState>((set, get) => ({
  doc: null,
  selection: new Set(),
  fileName: "document",
  preflightHistory: new Set(),
  setDoc: (doc, fileName) => {
    const settings = useSettings.getState().autoApply;
    const blocks = mapParagraphs(doc.blocks, (p) => ({
      ...p,
      rules: applyAutoSettingsToRules(p.rules, settings, {
        sectionBreakBefore: p.sectionBreakBefore,
      }),
    }));
    set({ doc: { ...doc, blocks }, fileName, selection: new Set(), preflightHistory: new Set() });
  },
  reset: () => set({ doc: null, selection: new Set(), fileName: "document", preflightHistory: new Set() }),
  updateParagraph: (id, patch) => {
    const doc = get().doc;
    if (!doc) return;
    set({
      doc: {
        ...doc,
        blocks: mapParagraphs(doc.blocks, (p) => (p.id === id ? { ...p, ...patch } : p)),
      },
    });
  },
  updateParagraphRule: (id, key, value) => {
    const doc = get().doc;
    if (!doc) return;
    set({
      doc: {
        ...doc,
        blocks: mapParagraphs(doc.blocks, (p) =>
          p.id === id ? { ...p, rules: { ...p.rules, [key]: value } } : p,
        ),
      },
    });
  },
  setStyle: (id, style) => {
    get().updateParagraph(id, { style });
  },
  setText: (id, text) => {
    const doc = get().doc;
    if (!doc) return;
    const p = findParagraph(doc.blocks, id);
    if (!p) return;
    // Replace text but keep first run's charStyle
    const charStyle = p.runs[0]?.charStyle;
    get().updateParagraph(id, { runs: text ? [{ text, charStyle }] : [] });
  },
  toggleSelect: (id) =>
    set((state) => {
      const next = new Set(state.selection);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selection: next };
    }),
  clearSelection: () => set({ selection: new Set() }),
  selectAll: () => {
    const doc = get().doc;
    if (!doc) return;
    const ids = new Set<string>();
    doc.blocks.forEach((b) => {
      if (b.kind === "paragraph") ids.add(b.id);
      else
        b.rows.forEach((r) =>
          r.forEach((c) => c.paragraphs.forEach((p) => ids.add(p.id))),
        );
    });
    set({ selection: ids });
  },
  bulkSetStyle: (style) => {
    const { doc, selection } = get();
    if (!doc) return;
    set({
      doc: {
        ...doc,
        blocks: mapParagraphs(doc.blocks, (p) =>
          selection.has(p.id) ? { ...p, style } : p,
        ),
      },
    });
  },
  bulkToggleRule: (key, value) => {
    const { doc, selection } = get();
    if (!doc) return;
    set({
      doc: {
        ...doc,
        blocks: mapParagraphs(doc.blocks, (p) =>
          selection.has(p.id) ? { ...p, rules: { ...p.rules, [key]: value } } : p,
        ),
      },
    });
  },
  updateStyleDef: (name, patch) => {
    const doc = get().doc;
    if (!doc) return;
    set({
      doc: {
        ...doc,
        paragraphStyles: doc.paragraphStyles.map((s) =>
          s.name === name ? { ...s, ...patch } : s,
        ),
      },
    });
  },
  renameStyle: (oldName, newName) => {
    const doc = get().doc;
    if (!doc || oldName === newName) return;
    set({
      doc: {
        ...doc,
        paragraphStyles: doc.paragraphStyles.map((s) =>
          s.name === oldName ? { ...s, name: newName } : s,
        ),
        blocks: mapParagraphs(doc.blocks, (p) =>
          p.style === oldName ? { ...p, style: newName } : p,
        ),
      },
    });
  },
  applyDocCleanup: (keys, value) => {
    const doc = get().doc;
    if (!doc) return;
    set({
      doc: {
        ...doc,
        blocks: mapParagraphs(doc.blocks, (p) => {
          const rules = { ...p.rules };
          for (const k of keys) {
            (rules as Record<string, unknown>)[k] = value;
          }
          return { ...p, rules };
        }),
      },
    });
  },
  bulkSetMultiSpaces: (value) => {
    const { doc, selection } = get();
    if (!doc) return;
    set({
      doc: {
        ...doc,
        blocks: mapParagraphs(doc.blocks, (p) =>
          selection.has(p.id) ? { ...p, rules: { ...p.rules, multiSpaces: value } } : p,
        ),
      },
    });
  },
  applyDocMultiSpaces: (value) => {
    const doc = get().doc;
    if (!doc) return;
    set({
      doc: {
        ...doc,
        blocks: mapParagraphs(doc.blocks, (p) => ({
          ...p,
          rules: { ...p.rules, multiSpaces: value },
        })),
      },
    });
  },
  replaceFont: (from, to) => {
    const doc = get().doc;
    if (!doc) return;
    set({
      doc: {
        ...doc,
        paragraphStyles: doc.paragraphStyles.map((s) =>
          s.font === from ? { ...s, font: to } : s,
        ),
        detectedFonts: doc.detectedFonts
          .map((f) => (f.name === from ? { ...f, name: to } : f))
          .reduce<typeof doc.detectedFonts>((acc, f) => {
            const existing = acc.find((x) => x.name === f.name);
            if (existing) existing.count += f.count;
            else acc.push({ ...f });
            return acc;
          }, []),
      },
    });
  },
  normalizeFonts: (to) => {
    const doc = get().doc;
    if (!doc) return;
    set({
      doc: {
        ...doc,
        paragraphStyles: doc.paragraphStyles.map((s) => ({ ...s, font: to })),
        detectedFonts: [{ name: to, count: doc.detectedFonts.reduce((n, f) => n + f.count, 0) }],
      },
    });
  },
  revertParagraphField: (id, field) => {
    const doc = get().doc;
    if (!doc) return;
    set({
      doc: {
        ...doc,
        blocks: mapParagraphs(doc.blocks, (p) => {
          if (p.id !== id || !p.original) return p;
          if (field === "style") return { ...p, style: p.original.style };
          if (field === "runs") return { ...p, runs: p.original.runs.map((r) => ({ ...r })) };
          return { ...p, rules: { ...p.rules, [field]: p.original.rules[field] } };
        }),
      },
    });
  },
  revertParagraph: (id) => {
    const doc = get().doc;
    if (!doc) return;
    set({
      doc: {
        ...doc,
        blocks: mapParagraphs(doc.blocks, (p) =>
          p.id === id && p.original
            ? {
                ...p,
                style: p.original.style,
                runs: p.original.runs.map((r) => ({ ...r })),
                rules: { ...p.original.rules },
              }
            : p,
        ),
      },
    });
  },
  applyCharStyleRange: (id, start, end, charStyle) => {
    const doc = get().doc;
    if (!doc || end <= start) return;
    set({
      doc: {
        ...doc,
        blocks: mapParagraphs(doc.blocks, (p) => {
          if (p.id !== id) return p;
          let pos = 0;
          const next: typeof p.runs = [];
          for (const r of p.runs) {
            if (r.footnoteRef !== undefined || r.text.length === 0) {
              next.push(r);
              continue;
            }
            const len = r.text.length;
            const rs = pos;
            const re = pos + len;
            pos = re;
            const a = Math.max(start, rs);
            const b = Math.min(end, re);
            if (a >= b) {
              next.push(r);
              continue;
            }
            const before = r.text.slice(0, a - rs);
            const middle = r.text.slice(a - rs, b - rs);
            const after = r.text.slice(b - rs);
            if (before) next.push({ ...r, text: before });
            if (middle) {
              const nr = { ...r, text: middle };
              if (charStyle) nr.charStyle = charStyle;
              else delete (nr as { charStyle?: string }).charStyle;
              next.push(nr);
            }
            if (after) next.push({ ...r, text: after });
          }
          // Merge adjacent runs with identical charStyle (and no footnoteRef)
          const merged: typeof next = [];
          for (const r of next) {
            const last = merged[merged.length - 1];
            if (
              last &&
              r.footnoteRef === undefined &&
              last.footnoteRef === undefined &&
              last.charStyle === r.charStyle
            ) {
              last.text += r.text;
            } else {
              merged.push({ ...r });
            }
          }
          return { ...p, runs: merged };
        }),
      },
    });
  },
  runPreflight: (action) => {
    const doc = get().doc;
    if (!doc) return;
    const fns: Record<PreflightAction, (d: ParsedDoc) => ParsedDoc> = {
      stripUnusedStyles,
      collapseBlanksToSpacing,
      normalizeLists,
      closeOrphanRuns,
      sectionBreaksToPageBreaks,
      sanitizeStyleNames,
    };
    const nextHistory = new Set(get().preflightHistory);
    nextHistory.add(action);
    set({ doc: fns[action](doc), preflightHistory: nextHistory });
  },
}));

export { findParagraph };
