import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
function saveAs(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
import { useEditor } from "@/store/editor";
import { buildDocx } from "@/lib/docx-build";
import { buildTaggedText } from "@/lib/tagged-text";
import { ParagraphRow } from "@/components/ParagraphRow";
import { TableRow as TableRowView } from "@/components/TableRow";
import { StylePanel } from "@/components/StylePanel";
import { BulkActionsBar } from "@/components/BulkActionsBar";
import { CleanupBar } from "@/components/CleanupBar";
import { LivePreview } from "@/components/LivePreview";
import { FileText, Download, FileCode2, Minimize2, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/edit")({
  head: () => ({
    meta: [
      { title: "Editor — Word → InDesign Reformatter" },
      { name: "description", content: "Review and refine each paragraph before exporting for InDesign." },
    ],
  }),
  component: EditPage,
});

function EditPage() {
  const navigate = useNavigate();
  const doc = useEditor((s) => s.doc);
  const fileName = useEditor((s) => s.fileName);
  const selectionCount = useEditor((s) => s.selection.size);

  const [compact, setCompact] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("edit-compact-header") === "true";
  });
  const [previewOpen, setPreviewOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("edit-live-preview") !== "false";
  });

  useEffect(() => {
    localStorage.setItem("edit-compact-header", String(compact));
  }, [compact]);
  useEffect(() => {
    localStorage.setItem("edit-live-preview", String(previewOpen));
  }, [previewOpen]);

  const stats = useMemo(() => {
    if (!doc) return { paragraphs: 0, words: 0 };
    let paragraphs = 0;
    let words = 0;
    const walk = (p: { runs: Array<{ text: string }> }) => {
      paragraphs++;
      for (const r of p.runs) {
        // Cheap word count without regex/split allocation per call.
        let inWord = false;
        for (let i = 0; i < r.text.length; i++) {
          const c = r.text.charCodeAt(i);
          const isSpace = c === 32 || c === 9 || c === 10 || c === 13;
          if (!isSpace && !inWord) {
            words++;
            inWord = true;
          } else if (isSpace) inWord = false;
        }
      }
    };
    doc.blocks.forEach((b) => {
      if (b.kind === "paragraph") walk(b);
      else b.rows.forEach((r) => r.forEach((c) => c.paragraphs.forEach(walk)));
    });
    return { paragraphs, words };
  }, [doc]);

  if (!doc) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
        <p className="text-muted-foreground">No document loaded.</p>
        <button
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          onClick={() => navigate({ to: "/" })}
        >
          Upload a file
        </button>
      </div>
    );
  }

  const onExportDocx = async () => {
    const blob = await buildDocx(doc);
    saveAs(blob, `${fileName}-reformatted.docx`);
  };
  const onExportTagged = () => {
    const txt = buildTaggedText(doc);
    const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
    saveAs(blob, `${fileName}-tagged.txt`);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      {/* ─────────── Sidebar ─────────── */}
      <aside className="hidden w-80 shrink-0 flex-col border-r border-border bg-sidebar lg:flex">
        <div className="border-b border-border px-6 py-5">
          <button
            className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground"
            onClick={() => navigate({ to: "/" })}
          >
            ← New file
          </button>
          <div className="mt-3 flex items-start gap-3">
            <div className="rounded-md bg-accent/70 p-2 text-primary-foreground">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {fileName}.docx
              </p>
              <p className="text-xs text-muted-foreground">
                {stats.words.toLocaleString()} words · {stats.paragraphs} paragraphs
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-2 py-4">
          <SidebarSection title="Cleanup rules">
            <div className="rounded-lg bg-background/60">
              <CleanupBar />
            </div>
          </SidebarSection>

          <SidebarSection title="Mapped styles">
            <StylePanel />
          </SidebarSection>
        </div>

        <div className="space-y-2 border-t border-border bg-sidebar-accent/60 px-6 py-5">
          <button
            onClick={onExportDocx}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            <Download className="h-4 w-4" />
            Export for InDesign
          </button>
          <button
            onClick={onExportTagged}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-accent bg-transparent px-4 py-2.5 text-sm font-semibold text-primary transition hover:bg-background"
          >
            <FileCode2 className="h-4 w-4" />
            Tagged Text (.txt)
          </button>
        </div>
      </aside>

      {/* ─────────── Main ─────────── */}
      <main className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <header
          className={cn(
            "z-10 flex shrink-0 items-center justify-between border-b border-border bg-background/60 px-8 backdrop-blur transition-all",
            compact ? "h-10" : "h-16",
          )}
        >
          <div className="flex items-center gap-5">
            <h1
              className={cn(
                "font-display font-bold tracking-tight",
                compact ? "text-sm" : "text-lg",
              )}
            >
              Review changes
            </h1>
            <span className="hidden h-4 w-px bg-border sm:block" />
            <p className={cn("hidden text-xs text-muted-foreground sm:block", compact && "lg:hidden")}>
              Every paragraph below is reviewable — toggle per line, or use bulk actions.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCompact((v) => !v)}
              title={compact ? "Expand header" : "Compact header"}
              className="hidden rounded-md border border-border p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground sm:block"
            >
              {compact ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
            </button>
            <div className="flex items-center gap-2 lg:hidden">
              <button
                onClick={onExportTagged}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
              >
                Tagged Text
              </button>
              <button
                onClick={onExportDocx}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
              >
                Export
              </button>
            </div>
          </div>
        </header>

        <div className={cn("flex-1 overflow-y-auto px-6 pb-40 sm:px-10", compact ? "py-4" : "py-10")}>
          <div className="mx-auto max-w-3xl space-y-4">
            {doc.blocks.map((b) =>
              b.kind === "paragraph" ? (
                <ParagraphRow key={b.id} paragraph={b} />
              ) : (
                <TableRowView key={b.id} table={b} />
              ),
            )}
          </div>
        </div>

        {/* Floating bulk-action footer (always visible — friendly affordance) */}
        <div className="pointer-events-none absolute inset-x-0 bottom-6 z-20 flex justify-center px-4">
          <div className="pointer-events-auto w-full max-w-3xl rounded-2xl border border-border bg-background/95 shadow-lg ring-1 ring-accent/30 backdrop-blur">
            <div className="flex items-center gap-2 px-3 py-1.5">
              <span className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {selectionCount > 0 ? `${selectionCount} selected` : "Bulk actions"}
              </span>
              <div className="h-4 w-px bg-border" />
              <div className="min-w-0 flex-1 overflow-x-auto">
                <BulkActionsBar />
              </div>
            </div>
          </div>
        </div>
      </main>
      <LivePreview open={previewOpen} onToggle={() => setPreviewOpen((v) => !v)} />
    </div>
  );
}

function SidebarSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="px-4">
      <h3 className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}
