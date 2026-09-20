import type { ParsedDoc } from "./types";

const KEY = "msw-session-v1";
const MAX_BYTES = 4_500_000; // ~4.5MB — well under typical localStorage 5MB cap

interface Snapshot {
  doc: ParsedDoc;
  fileName: string;
  savedAt: number;
}

let timer: ReturnType<typeof setTimeout> | null = null;

export function saveSessionDebounced(doc: ParsedDoc, fileName: string) {
  if (typeof window === "undefined") return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    try {
      const payload: Snapshot = { doc, fileName, savedAt: Date.now() };
      const json = JSON.stringify(payload, (_k, v) => {
        // Sets aren't serializable; we don't persist any in ParsedDoc.
        return v instanceof Set ? Array.from(v) : v;
      });
      if (json.length > MAX_BYTES) return; // silently skip oversize docs
      localStorage.setItem(KEY, json);
    } catch {
      // Quota / serialization failure — best-effort persistence only.
    }
  }, 600);
}

export function loadSession(): Snapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Snapshot;
    if (!parsed?.doc || !Array.isArray(parsed.doc.blocks)) return null;
    // Backfill preflightWarnings for sessions saved before these fields existed.
    parsed.doc.preflightWarnings = {
      ...EMPTY_PREFLIGHT_WARNINGS,
      ...(parsed.doc.preflightWarnings ?? {}),
    };
    return parsed;
  } catch {
    return null;
  }
}

export function clearSession() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}
