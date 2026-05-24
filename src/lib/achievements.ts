import type { IssueBreakdown } from "./health";

export interface Achievement {
  id: string;
  title: string;
  desc: string;
  icon: string;
  /** Tailwind text/bg classes for the badge accent. */
  tone: "emerald" | "sky" | "violet" | "amber" | "rose" | "indigo";
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "soft-landing",
    title: "Soft Landing",
    desc: "Converted 10+ soft returns to hard returns",
    icon: "↵",
    tone: "sky",
  },
  {
    id: "line-tamer",
    title: "Line Tamer",
    desc: "Converted 50+ soft returns",
    icon: "⤓",
    tone: "indigo",
  },
  {
    id: "tab-hunter",
    title: "Tab Hunter",
    desc: "Cleaned 5+ leading tabs",
    icon: "⇥",
    tone: "violet",
  },
  {
    id: "smart-talker",
    title: "Smart Talker",
    desc: "Fixed 10+ straight quote paragraphs",
    icon: "“”",
    tone: "amber",
  },
  {
    id: "dash-master",
    title: "Dash Master",
    desc: "Fixed 5+ double-hyphen dashes",
    icon: "—",
    tone: "rose",
  },
  {
    id: "style-mapper",
    title: "Style Mapper",
    desc: "Mapped every unmapped paragraph style",
    icon: "🎯",
    tone: "violet",
  },
  {
    id: "pristine-export",
    title: "Pristine Export",
    desc: "Exported with zero remaining warnings",
    icon: "✨",
    tone: "emerald",
  },
  {
    id: "clean-sweep",
    title: "Clean Sweep",
    desc: "Resolved every issue from import",
    icon: "🧹",
    tone: "emerald",
  },
];

/** Returns ids of achievements earned given the initial vs current breakdown at export time. */
export function evaluateAchievements(
  initial: IssueBreakdown | null,
  current: IssueBreakdown,
): string[] {
  if (!initial) return [];
  const resolved = {
    softBreaks: Math.max(0, initial.softBreaks - current.softBreaks),
    tabs: Math.max(0, initial.tabs - current.tabs),
    quotes: Math.max(0, initial.quotes - current.quotes),
    dashes: Math.max(0, initial.dashes - current.dashes),
    unmapped: Math.max(0, initial.unmapped - current.unmapped),
  };
  const earned: string[] = [];
  if (resolved.softBreaks >= 10) earned.push("soft-landing");
  if (resolved.softBreaks >= 50) earned.push("line-tamer");
  if (resolved.tabs >= 5) earned.push("tab-hunter");
  if (resolved.quotes >= 10) earned.push("smart-talker");
  if (resolved.dashes >= 5) earned.push("dash-master");
  if (initial.unmapped > 0 && current.unmapped === 0) earned.push("style-mapper");
  if (current.total === 0) earned.push("pristine-export");
  if (initial.total > 0 && current.total === 0) earned.push("clean-sweep");
  return earned;
}

const STORAGE_KEY = "achievements.earned.v1";

export function loadEarnedAchievements(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x) => typeof x === "string"));
  } catch {
    return new Set();
  }
}

export function saveEarnedAchievements(set: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    /* ignore quota errors */
  }
}

export function getAchievement(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

export const TONE_CLASSES: Record<Achievement["tone"], string> = {
  emerald: "bg-emerald-500/15 text-emerald-700 ring-emerald-500/30 dark:text-emerald-300",
  sky: "bg-sky-500/15 text-sky-700 ring-sky-500/30 dark:text-sky-300",
  violet: "bg-violet-500/15 text-violet-700 ring-violet-500/30 dark:text-violet-300",
  amber: "bg-amber-500/15 text-amber-800 ring-amber-500/30 dark:text-amber-300",
  rose: "bg-rose-500/15 text-rose-700 ring-rose-500/30 dark:text-rose-300",
  indigo: "bg-indigo-500/15 text-indigo-700 ring-indigo-500/30 dark:text-indigo-300",
};
