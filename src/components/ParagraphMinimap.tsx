import { useEffect, useMemo, useState } from "react";
import type { Block, ParagraphBlock } from "@/lib/types";
import { detectIssues, ISSUE_COLOR, type IssueKey } from "@/lib/issues";

interface Props {
  blocks: Block[];
  scrollRef: React.RefObject<HTMLElement | null>;
  onJump: (id: string) => void;
}

interface Marker {
  id: string;
  index: number;
  total: number;
  worst: IssueKey;
}

function walk(blocks: Block[], fn: (p: ParagraphBlock) => void) {
  for (const b of blocks) {
    if (b.kind === "paragraph") fn(b);
    else b.rows.forEach((r) => r.forEach((c) => c.paragraphs.forEach(fn)));
  }
}

const SEVERITY: IssueKey[] = ["bleed", "qq", "dash", "soft", "tabs", "spaces", "unstyled", "empty"];

export function ParagraphMinimap({ blocks, scrollRef, onJump }: Props) {
  const markers = useMemo<Marker[]>(() => {
    const all: ParagraphBlock[] = [];
    walk(blocks, (p) => all.push(p));
    const total = all.length;
    const out: Marker[] = [];
    all.forEach((p, index) => {
      const issues = detectIssues(p);
      if (issues.length === 0) return;
      const worst =
        SEVERITY.find((k) => issues.some((i) => i.key === k)) ?? issues[0].key;
      out.push({ id: p.id, index, total, worst });
    });
    return out;
  }, [blocks]);

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

  if (markers.length === 0) return null;

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
        {/* issue markers */}
        {markers.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onJump(m.id);
            }}
            title={`Issue: ${m.worst}`}
            className={`pointer-events-auto absolute left-1/2 h-1.5 w-3 -translate-x-1/2 cursor-pointer rounded-full transition hover:scale-150 ${ISSUE_COLOR[m.worst]}`}
            style={{ top: `${(m.index / Math.max(1, m.total - 1)) * 100}%` }}
          />
        ))}
      </div>
    </div>
  );
}
