import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { parseDocx } from "@/lib/docx-parse";
import { useEditor } from "@/store/editor";
import { buildDocx } from "@/lib/docx-build";
import { buildTaggedText } from "@/lib/tagged-text";
import { Progress } from "@/components/ui/progress";
import { ParagraphRow } from "@/components/ParagraphRow";
import { TableRow as TableRowView } from "@/components/TableRow";
import { StylePanel } from "@/components/StylePanel";
import { BulkActionsBar } from "@/components/BulkActionsBar";
import { CleanupBar } from "@/components/CleanupBar";
import { LivePreview } from "@/components/LivePreview";
import { FileText, Download, FileCode2, Minimize2, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

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

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Word → InDesign Reformatter" },
      {
        name: "description",
        content:
          "Clean up Word documents for InDesign: convert formatting to styles, tabs to margins, soft to hard returns, and blank lines to page breaks — with per-line control.",
      },
      { property: "og:title", content: "Word → InDesign Reformatter" },
      {
        property: "og:description",
        content:
          "Reformat .docx files for InDesign import with paragraph + character styles, cleanup rules, and tagged-text export.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const doc = useEditor((s) => s.doc);
  return doc ? <EditorView /> : <UploadView />;
}

function UploadView() {
  const setDoc = useEditor((s) => s.setDoc);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setLoading(true);
    setError(null);
    setProgress(2);
    setPhase("Reading file…");
    let cancelled = false;
    // Simulated progress ramp — parseDocx is synchronous-ish so we animate.
    const tick = (target: number, label: string) => {
      setPhase(label);
      setProgress((p) => Math.max(p, target));
    };
    const ramp = setInterval(() => {
      if (cancelled) return;
      setProgress((p) => (p < 90 ? p + Math.max(1, (90 - p) * 0.08) : p));
    }, 120);
    try {
      const buf = await file.arrayBuffer();
      tick(25, "Unzipping document…");
      await new Promise((r) => setTimeout(r, 0));
      tick(45, "Parsing paragraphs…");
      const parsed = await parseDocx(buf);
      tick(95, "Finalizing…");
      setDoc(parsed, file.name.replace(/\.docx$/i, ""));
      setProgress(100);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to parse file.");
    } finally {
      cancelled = true;
      clearInterval(ramp);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="font-display text-4xl font-bold tracking-tight text-balance">
          Clean up Word for InDesign in minutes.
        </h2>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Upload a <code className="rounded bg-muted px-1 font-mono text-foreground">.docx</code>.
          Each paragraph is parsed and tagged with a paragraph style and the cleanups it needs —
          tabs to margins, soft returns to hard, blank lines to page breaks,
          smart quotes, and more. Review or override every line, then export a
          clean Word file plus InDesign Tagged Text.
        </p>

        <label
          className="mt-10 block cursor-pointer rounded-2xl border-2 border-dashed border-accent bg-sidebar/40 p-12 text-center transition-colors hover:border-primary hover:bg-sidebar"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files[0];
            if (f) handleFile(f);
          }}
        >
          <input
            type="file"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <div className="font-display text-lg font-semibold text-primary">
            {loading ? "Parsing…" : "Drop a .docx file here, or click to choose"}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Everything runs locally in your browser — nothing is uploaded.
          </div>
        </label>

        {error && (
          <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="mt-12 grid gap-4 text-sm sm:grid-cols-2">
          <Feature title="Paragraph + character styles">
            Bold, italic, super/subscript runs become named character styles
            that map straight to InDesign.
          </Feature>
          <Feature title="Per-line control">
            Toggle every rule on a per-paragraph basis, edit text inline, and
            apply changes in bulk.
          </Feature>
          <Feature title="Cleanup baked in">
            Smart quotes, trailing spaces, track-changes removal, page breaks
            from blank-line runs.
          </Feature>
          <Feature title="Two outputs">
            Reformatted <code className="rounded bg-muted px-1 font-mono text-foreground">.docx</code> plus InDesign
            Tagged Text XML — File → Place and styles map automatically.
          </Feature>
        </div>
      </main>
    </div>
  );
}

function Feature({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="font-display font-semibold text-primary">{title}</div>
      <div className="mt-1 text-muted-foreground">{children}</div>
    </div>
  );
}

function EditorView() {
  const doc = useEditor((s) => s.doc)!;
  const fileName = useEditor((s) => s.fileName);
  const selectionCount = useEditor((s) => s.selection.size);
  const reset = useEditor((s) => s.reset);

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
    let paragraphs = 0;
    let words = 0;
    const walk = (p: { runs: Array<{ text: string }> }) => {
      paragraphs++;
      for (const r of p.runs) {
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

  const onExportDocx = async () => {
    const blob = await buildDocx(doc);
    saveAs(blob, `${fileName}-reformatted.docx`);
  };
  const onExportTagged = () => {
    const txt = buildTaggedText(doc);
    const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
    saveAs(blob, `${fileName}-tagged.txt`);
  };
  const onNewFile = () => reset();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <aside className="hidden w-80 shrink-0 flex-col border-r border-border bg-sidebar lg:flex">
        <div className="border-b border-border px-6 py-5">
          <button
            className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground"
            onClick={onNewFile}
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
