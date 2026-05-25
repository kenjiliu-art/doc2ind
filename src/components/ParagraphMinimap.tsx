import { useEffect, useMemo, useState } from "react";
import type { Block, ParagraphBlock, ParagraphRules } from "@/lib/types";
import { detectIssues, ISSUE_COLOR, type IssueKey } from "@/lib/issues";
import type { PreviewFilter } from "./LivePreview";

interface Props {
  blocks: Block[];
  scrollRef: React.RefObject<HTMLElement | null>;
  onJump: (id: string) => void;
  filter: PreviewFilter;
  selection: Set<string>;
}

interface Marker {
  id: string;
  index: number;
  total: number;
  worst: IssueKey;
  match: boolean;
}

function walk(blocks: Block[], fn: (p: ParagraphBlock) => void) {
  for (const b of blocks) {
    if (b.kind === "paragraph") fn(b);
    else b.rows.forEach((r) => r.forEach((c) => c.paragraphs.forEach(fn)));
  }
}

const SEVERITY: IssueKey[] = ["bleed", "qq", "dash", "soft", "tabs", "spaces", "unstyled", "empty"];

function runsText(p: ParagraphBlock) {
  return p.runs.map((r) => r.text).join("");
}

function paragraphMatches(p: ParagraphBlock, filter: PreviewFilter, selection: Set<string>): boolean {
  switch (filter) {
    case "all":
      return true;
    case "warnings":
      return detectIssues(p).length > 0;
    case "changed": {
      const o = p.original;
      if (!o) return false;
      if (p.style !== o.style) return true;
      if (runsText(p) !== runsText({ ...p, runs: o.runs })) return true;
      return (Object.keys(p.rules) as Array<keyof ParagraphRules>).some(
        (k) => p.rules[k] !== o.rules[k],
      );
    }
    case "selected":
      return selection.has(p.id);
    case "headings":
      return /^Heading/i.test(p.style);
    case "unstyled":
      return !p.sourceStyle;
  }
}

export function ParagraphMinimap({ blocks, scrollRef, onJump, filter, selection }: Props) {
  const { markers, matchPositions } = useMemo(() => {
    const all: ParagraphBlock[] = [];
    walk(blocks, (p) => all.push(p));
    const total = all.length;
    const out: Marker[] = [];
    const positions: number[] = [];
    all.forEach((p, index) => {
      const match = filter !== "all" && paragraphMatches(p, filter, selection);
      if (match) positions.push(index / Math.max(1, total - 1));
      const issues = detectIssues(p);
      if (issues.length === 0) return;
      const worst =
        SEVERITY.find((k) => issues.some((i) => i.key === k)) ?? issues[0].key;
      out.push({ id: p.id, index, total, worst, match });
    });
    return { markers: out, matchPositions: positions };
  }, [blocks, filter, selection]);

  const [scrollY, setScrollY] = useState({ top: 0, h: 1, sh: 1 });
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () =>
      setScrollY({ top: el.scrollTop, h: el.clientHeight, sh: el.scrollHeight });
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [scrollRef, blocks]);

  if (markers.length === 0 && matchPositions.length === 0) return null;

  const viewportRatio = Math.min(1, scrollY.h / Math.max(1, scrollY.sh));
  const viewportTop = scrollY.top / Math.max(1, scrollY.sh);

  return (
    <div
      className="pointer-events-none absolute right-1 top-2 bottom-2 z-20 hidden w-2.5 lg:block"
      aria-hidden
    >
      <div className="relative h-full w-full rounded-full bg-neutral-200/60">
        {/* viewport indicator */}
        <div
          className="absolute inset-x-0 rounded-full bg-neutral-400/30"
          style={{
            top: `${viewportTop * 100}%`,
            height: `${Math.max(4, viewportRatio * 100)}%`,
          }}
        />
        {/* filter match ticks — drawn underneath issue markers */}
        {matchPositions.map((pos, i) => (
          <div
            key={`m-${i}`}
            className="absolute left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-blue-400/70 ring-1 ring-blue-200"
            style={{ top: `${pos * 100}%` }}
          />
        ))}
        {/* issue markers */}
        {markers.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onJump(m.id);
            }}
            title={`Issue: ${m.worst}${m.match ? " · matches filter" : ""}`}
            className={`pointer-events-auto absolute left-1/2 h-1.5 w-3 -translate-x-1/2 cursor-pointer rounded-full transition hover:scale-150 ${ISSUE_COLOR[m.worst]} ${
              filter !== "all" && !m.match ? "opacity-25" : ""
            } ${m.match ? "ring-1 ring-blue-400" : ""}`}
            style={{ top: `${(m.index / Math.max(1, m.total - 1)) * 100}%` }}
          />
        ))}
      </div>
    </div>
  );
}
