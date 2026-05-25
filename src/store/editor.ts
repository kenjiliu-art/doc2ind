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
  collapseBlanksToSpacing,
  normalizeLists,
  removeEmptyParagraphs,
  sanitizeStyleNames,
  sectionBreaksToPageBreaks,
  stripUnusedStyles,
  trailingStyledSpacesToEnEm,
  trimRunBleed,
} from "@/lib/preflight";
import { useSettings, applyAutoSettingsToRules } from "@/store/settings";
import { saveSessionDebounced, clearSession } from "@/lib/storage";
import { countIssues, countIssuesDetailed, type IssueBreakdown } from "@/lib/health";

const COMBO_WINDOW_MS = 2500;

export type PreflightAction =
  | "collapseBlanksToSpacing"
  | "normalizeLists"
  | "removeEmptyParagraphs"
  | "sanitizeStyleNames"
  | "sectionBreaksToPageBreaks"
  | "stripUnusedStyles"
  | "trailingStyledSpacesToEnEm"
  | "trimRunBleed";

const HISTORY_LIMIT = 50;

interface EditorState {
  doc: ParsedDoc | null;
  selection: Set<string>;
  /** Last paragraph id toggled — anchor for shift-click range-select. */
  selectionAnchor: string | null;
  fileName: string;
  preflightHistory: Set<PreflightAction>;
  /** Number of items each preflight pass eliminated the last time it ran. */
  preflightFixed: Partial<Record<PreflightAction, number>>;
  past: ParsedDoc[];
  future: ParsedDoc[];
  /** Issue count captured immediately after parsing — baseline for health score & before/after. */
  initialIssues: number;
  /** Per-category issue breakdown captured immediately after parsing. */
  initialIssueBreakdown: IssueBreakdown | null;
  /** Number of mutations performed in rapid succession (combo). */
  comboCount: number;
  /** Timestamp of last mutation, used for combo window. */
  lastEditAt: number;
  /** Monotonic tick incremented every time a combo extends — components subscribe to trigger pop animation. */
  comboTick: number;

  setDoc: (doc: ParsedDoc, fileName: string) => void;
  reset: () => void;
  undo: () => void;
  redo: () => void;
  updateParagraph: (id: string, patch: Partial<ParagraphBlock>) => void;
  updateParagraphRule: <K extends keyof ParagraphRules>(id: string, key: K, value: ParagraphRules[K]) => void;
  setStyle: (id: string, style: ParagraphStyle) => void;
  setText: (id: string, text: string) => void;
  toggleSelect: (id: string) => void;
  rangeSelect: (id: string) => void;
  clearSelection: () => void;
  selectAll: () => void;
  bulkSetStyle: (style: ParagraphStyle) => void;
  bulkToggleRule: (key: keyof ParagraphRules, value: boolean) => void;
  updateStyleDef: (name: string, patch: Partial<StyleDef>) => void;
  renameStyle: (oldName: string, newName: string) => void;
  mapSourceStyle: (sourceStyle: string, target: ParagraphStyle | "__discard") => void;
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

/** Flat list of paragraph ids in document order (top-level only — tables not included in range select). */
function flatParaIds(blocks: Block[]): string[] {
  const out: string[] = [];
  for (const b of blocks) {
    if (b.kind === "paragraph") out.push(b.id);
    else
      for (const row of b.rows)
        for (const cell of row)
          for (const p of cell.paragraphs) out.push(p.id);
  }
  return out;
}

/** Flat iteration over all paragraphs (including those inside tables). */
function flatParagraphs(blocks: Block[]): ParagraphBlock[] {
  const out: ParagraphBlock[] = [];
  for (const b of blocks) {
    if (b.kind === "paragraph") out.push(b);
    else
      for (const row of b.rows)
        for (const cell of row)
          for (const p of cell.paragraphs) out.push(p);
  }
  return out;
}

/** Number of paragraphs whose visible text is empty. */
function countEmptyParagraphs(doc: ParsedDoc): number {
  return flatParagraphs(doc.blocks).filter(
    (p) => !p.runs.map((r) => r.text).join("").trim(),
  ).length;
}

/** Number of paragraphs containing a styled run that ends in whitespace (bleed candidates). */
function countBleedParagraphs(doc: ParsedDoc): number {
  return flatParagraphs(doc.blocks).filter((p) =>
    p.runs.some((r) => r.charStyle && r.text && /\s$/.test(r.text)),
  ).length;
}

/** Metric used to measure what a given preflight pass "fixed" (before − after). */
const PREFLIGHT_METRIC: Partial<Record<PreflightAction, (d: ParsedDoc) => number>> = {
  collapseBlanksToSpacing: countEmptyParagraphs,
  removeEmptyParagraphs: countEmptyParagraphs,
  stripUnusedStyles: (d) => d.paragraphStyles.length,
  trailingStyledSpacesToEnEm: countBleedParagraphs,
  trimRunBleed: countBleedParagraphs,
};


export const useEditor = create<EditorState>((set, get) => {
  /** Snapshot current doc into past[] before a mutation; also extend combo counter. */
  const snap = () => {
    const cur = get().doc;
    if (!cur) return;
    const past = get().past.concat(cur).slice(-HISTORY_LIMIT);
    const now = Date.now();
    const { lastEditAt, comboCount, comboTick } = get();
    const withinWindow = now - lastEditAt <= COMBO_WINDOW_MS;
    const nextCombo = withinWindow ? comboCount + 1 : 1;
    set({
      past,
      future: [],
      lastEditAt: now,
      comboCount: nextCombo,
      comboTick: comboTick + 1,
    });
  };

  return {
    doc: null,
    selection: new Set(),
    selectionAnchor: null,
    fileName: "document",
    preflightHistory: new Set(),
    preflightFixed: {},
    past: [],
    future: [],
    initialIssues: 0,
    initialIssueBreakdown: null,

    comboCount: 0,
    lastEditAt: 0,
    comboTick: 0,
    setDoc: (doc, fileName) => {
      // Capture pre-import diagnostics on the raw doc BEFORE auto-rules run,
      // so the health score reflects the document's true starting state.
      const rawBreakdown = countIssuesDetailed(doc);
      const settings = useSettings.getState().autoApply;
      let nextDoc: ParsedDoc = { ...doc };
      const blocks = mapParagraphs(doc.blocks, (p) => ({
        ...p,
        rules: applyAutoSettingsToRules(p.rules, settings, {
          sectionBreakBefore: p.sectionBreakBefore,
        }),
      }));
      nextDoc = { ...nextDoc, blocks };

      const preflightHistory = new Set<PreflightAction>();
      const preflightFixed: Partial<Record<PreflightAction, number>> = {};
      const preflightFns: Array<{
        key: Exclude<PreflightAction, "sectionBreaksToPageBreaks">;
        fn: (d: ParsedDoc) => ParsedDoc;
      }> = [
        { key: "collapseBlanksToSpacing", fn: collapseBlanksToSpacing },
        { key: "normalizeLists", fn: normalizeLists },
        { key: "removeEmptyParagraphs", fn: removeEmptyParagraphs },
        { key: "sanitizeStyleNames", fn: sanitizeStyleNames },
        { key: "stripUnusedStyles", fn: stripUnusedStyles },
        { key: "trailingStyledSpacesToEnEm", fn: trailingStyledSpacesToEnEm },
        { key: "trimRunBleed", fn: trimRunBleed },
      ];
      for (const { key, fn } of preflightFns) {
        if (settings[key]) {
          const metric = PREFLIGHT_METRIC[key];
          const before = metric ? metric(nextDoc) : 0;
          nextDoc = fn(nextDoc);
          if (metric) {
            const fixed = Math.max(0, before - metric(nextDoc));
            if (fixed > 0) preflightFixed[key] = fixed;
          }
          preflightHistory.add(key);
        }
      }

      set({
        doc: nextDoc,
        fileName,
        selection: new Set(),
        selectionAnchor: null,
        preflightHistory,
        preflightFixed,
        past: [],
        future: [],
        initialIssues: rawBreakdown.total,
        initialIssueBreakdown: rawBreakdown,
        comboCount: 0,
        lastEditAt: 0,
        comboTick: 0,
      });
    },
    reset: () => {
      clearSession();
      set({
        doc: null,
        selection: new Set(),
        selectionAnchor: null,
        fileName: "document",
        preflightHistory: new Set(),
        preflightFixed: {},
        past: [],
        future: [],
        initialIssues: 0,
        initialIssueBreakdown: null,
        comboCount: 0,
        lastEditAt: 0,
        comboTick: 0,
      });
    },

    undo: () => {
      const { past, doc, future } = get();
      if (past.length === 0 || !doc) return;
      const prev = past[past.length - 1];
      set({
        doc: prev,
        past: past.slice(0, -1),
        future: future.concat(doc).slice(-HISTORY_LIMIT),
      });
    },
    redo: () => {
      const { past, doc, future } = get();
      if (future.length === 0 || !doc) return;
      const next = future[future.length - 1];
      set({
        doc: next,
        future: future.slice(0, -1),
        past: past.concat(doc).slice(-HISTORY_LIMIT),
      });
    },
    updateParagraph: (id, patch) => {
      const doc = get().doc;
      if (!doc) return;
      snap();
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
      snap();
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
      const charStyle = p.runs[0]?.charStyle;
      get().updateParagraph(id, { runs: text ? [{ text, charStyle }] : [] });
    },
    toggleSelect: (id) =>
      set((state) => {
        const next = new Set(state.selection);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return { selection: next, selectionAnchor: id };
      }),
    rangeSelect: (id) => {
      const { doc, selectionAnchor, selection } = get();
      if (!doc || !selectionAnchor || selectionAnchor === id) {
        get().toggleSelect(id);
        return;
      }
      const ids = flatParaIds(doc.blocks);
      const a = ids.indexOf(selectionAnchor);
      const b = ids.indexOf(id);
      if (a === -1 || b === -1) {
        get().toggleSelect(id);
        return;
      }
      const [lo, hi] = a < b ? [a, b] : [b, a];
      const next = new Set(selection);
      for (let i = lo; i <= hi; i++) next.add(ids[i]);
      set({ selection: next });
    },
    clearSelection: () => set({ selection: new Set(), selectionAnchor: null }),
    selectAll: () => {
      const doc = get().doc;
      if (!doc) return;
      set({ selection: new Set(flatParaIds(doc.blocks)) });
    },
    bulkSetStyle: (style) => {
      const { doc, selection } = get();
      if (!doc) return;
      snap();
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
      snap();
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
      snap();
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
      snap();
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
    mapSourceStyle: (sourceStyle, target) => {
      const doc = get().doc;
      if (!doc) return;
      snap();
      if (target === "__discard") {
        const filtered: Block[] = [];
        for (const b of doc.blocks) {
          if (b.kind === "paragraph") {
            if (b.sourceStyle !== sourceStyle) filtered.push(b);
          } else {
            filtered.push({
              ...b,
              rows: b.rows.map((row) =>
                row.map((cell) => ({
                  ...cell,
                  paragraphs: cell.paragraphs.filter((p) => p.sourceStyle !== sourceStyle),
                })),
              ),
            });
          }
        }
        set({ doc: { ...doc, blocks: filtered } });
        return;
      }
      set({
        doc: {
          ...doc,
          blocks: mapParagraphs(doc.blocks, (p) =>
            p.sourceStyle === sourceStyle ? { ...p, style: target } : p,
          ),
        },
      });
    },
    applyDocCleanup: (keys, value) => {
      const doc = get().doc;
      if (!doc) return;
      snap();
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
      snap();
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
      snap();
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
      snap();
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
      snap();
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
      snap();
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
      snap();
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
      snap();
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
        trimRunBleed,
        sectionBreaksToPageBreaks,
        sanitizeStyleNames,
        removeEmptyParagraphs,
        removeTrailingTabs,
        trailingStyledSpacesToEnEm,
      };
      snap();
      const nextHistory = new Set(get().preflightHistory);
      nextHistory.add(action);
      const metric = PREFLIGHT_METRIC[action];
      const before = metric ? metric(doc) : 0;
      const nextDoc = fns[action](doc);
      const nextFixed = { ...get().preflightFixed };
      if (metric) {
        const fixed = Math.max(0, before - metric(nextDoc));
        if (fixed > 0) nextFixed[action] = fixed;
        else delete nextFixed[action];
      }
      set({ doc: nextDoc, preflightHistory: nextHistory, preflightFixed: nextFixed });
    },
  };
});

// Auto-save: persist doc + fileName whenever the doc reference changes.
if (typeof window !== "undefined") {
  useEditor.subscribe((state, prev) => {
    if (state.doc && state.doc !== prev?.doc) {
      saveSessionDebounced(state.doc, state.fileName);
    }
  });
}

export { findParagraph };
