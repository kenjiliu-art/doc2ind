import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ParagraphRules } from "@/lib/types";

export type AutoApplyKey =
  | "tabsToMargin"
  | "softToHard"
  | "pageBreakBefore"
  | "smartQuotes"
  | "dashes"
  | "trimTrailing";

export interface AutoApplySettings {
  tabsToMargin: boolean;
  softToHard: boolean;
  pageBreakBefore: boolean;
  smartQuotes: boolean;
  dashes: boolean;
  trimTrailing: boolean;
}

interface SettingsState {
  autoApply: AutoApplySettings;
  setAutoApply: (key: AutoApplyKey, value: boolean) => void;
  resetAutoApply: () => void;
}

const DEFAULTS: AutoApplySettings = {
  tabsToMargin: true,
  softToHard: true,
  pageBreakBefore: true,
  smartQuotes: true,
  dashes: true,
  trimTrailing: true,
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      autoApply: { ...DEFAULTS },
      setAutoApply: (key, value) =>
        set((s) => ({ autoApply: { ...s.autoApply, [key]: value } })),
      resetAutoApply: () => set({ autoApply: { ...DEFAULTS } }),
    }),
    { name: "msw-auto-apply-settings" },
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
    tabsToMargin: settings.tabsToMargin ? true : rules.tabsToMargin,
    softToHard: settings.softToHard ? true : rules.softToHard,
    // Only auto-enable pageBreakBefore where the source actually had a section break
    pageBreakBefore:
      settings.pageBreakBefore && ctx.sectionBreakBefore
        ? true
        : rules.pageBreakBefore,
    smartQuotes: settings.smartQuotes ? true : rules.smartQuotes,
    dashes: settings.dashes ? true : rules.dashes,
    trimTrailing: settings.trimTrailing ? true : rules.trimTrailing,
  };
}
