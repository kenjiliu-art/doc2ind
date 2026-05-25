import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ParagraphRules } from "@/lib/types";

export type AutoApplyKey =
  | "closeOrphanRuns"
  | "collapseBlanksToSpacing"
  | "dashes"
  | "normalizeLists"
  | "pageBreakBefore"
  | "removeEmptyParagraphs"
  | "removeTrailingTabs"
  | "sanitizeStyleNames"
  | "smartQuotes"
  | "softToHard"
  | "stripUnusedStyles"
  | "tabsToMargin"
  | "trimRunBleed"
  | "trimTrailing"
  | "trailingStyledSpacesToEnEm";

export interface AutoApplySettings {
  closeOrphanRuns: boolean;
  collapseBlanksToSpacing: boolean;
  dashes: boolean;
  normalizeLists: boolean;
  pageBreakBefore: boolean;
  removeEmptyParagraphs: boolean;
  removeTrailingTabs: boolean;
  sanitizeStyleNames: boolean;
  smartQuotes: boolean;
  softToHard: boolean;
  stripUnusedStyles: boolean;
  tabsToMargin: boolean;
  trimRunBleed: boolean;
  trimTrailing: boolean;
  trailingStyledSpacesToEnEm: boolean;
}

interface SettingsState {
  autoApply: AutoApplySettings;
  setAutoApply: (key: AutoApplyKey, value: boolean) => void;
  resetAutoApply: () => void;
}

const DEFAULTS: AutoApplySettings = {
  closeOrphanRuns: false,
  collapseBlanksToSpacing: false,
  dashes: true,
  normalizeLists: false,
  pageBreakBefore: true,
  removeEmptyParagraphs: false,
  removeTrailingTabs: false,
  sanitizeStyleNames: false,
  smartQuotes: true,
  softToHard: true,
  stripUnusedStyles: true,
  tabsToMargin: true,
  trimRunBleed: false,
  trimTrailing: true,
  trailingStyledSpacesToEnEm: false,
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      autoApply: { ...DEFAULTS },
      setAutoApply: (key, value) =>
        set((s) => ({ autoApply: { ...s.autoApply, [key]: value } })),
      resetAutoApply: () => set({ autoApply: { ...DEFAULTS } }),
    }),
    {
      name: "msw-auto-apply-settings",
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<SettingsState>;
        return {
          ...current,
          ...p,
          autoApply: { ...DEFAULTS, ...(p.autoApply ?? {}) },
        };
      },
    },
  ),
);

/** Mutate paragraph rules according to enabled auto-apply settings. */
export function applyAutoSettingsToRules(
  rules: ParagraphRules,
  settings: AutoApplySettings,
  ctx: { sectionBreakBefore?: boolean },
): ParagraphRules {
  return {
    ...rules,
    dashes: settings.dashes ? true : rules.dashes,
    // Only auto-enable pageBreakBefore where the source actually had a section break
    pageBreakBefore:
      settings.pageBreakBefore && ctx.sectionBreakBefore
        ? true
        : rules.pageBreakBefore,
    smartQuotes: settings.smartQuotes ? true : rules.smartQuotes,
    softToHard: settings.softToHard ? true : rules.softToHard,
    tabsToMargin: settings.tabsToMargin ? true : rules.tabsToMargin,
    trimTrailing: settings.trimTrailing ? true : rules.trimTrailing,
  };
}
