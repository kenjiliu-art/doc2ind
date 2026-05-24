import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { parseDocx } from "@/lib/docx-parse";
import { useEditor } from "@/store/editor";
import { buildDocx } from "@/lib/docx-build";
import { buildTaggedText } from "@/lib/tagged-text";
import { CleanupBar } from "@/components/CleanupBar";
import { CharStylesPanel } from "@/components/CharStylesPanel";
import { LivePreview } from "@/components/LivePreview";
import { FileText, Download, FileCode2 } from "lucide-react";

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
  component: IndexPage,
});

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

function IndexPage() {
  const doc = useEditor((s) => s.doc);
  return doc ? <EditorView /> : <UploadView />;
}

function UploadView() {
  const setDoc = useEditor((s) => s.setDoc);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setLoading(true);
    setError(null);
    setProgress(0);
    setProgressLabel("Reading file…");
    try {
      const buf = await file.arrayBuffer();
      const parsed = await parseDocx(buf, (p, l) => {
        setProgress(p);
        setProgressLabel(l);
      });
      setProgress(1);
      setProgressLabel("Done");
      setDoc(parsed, file.name.replace(/\.docx$/i, ""));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to parse file.");
    } finally {
      setLoading(false);
    }
  };

  const loadSample = async (name: string) => {
    setLoading(true);
    setError(null);
    setProgress(0);
    setProgressLabel("Loading sample…");
    try {
      const res = await fetch(`/${name}.docx`);
      if (!res.ok) throw new Error("Could not load sample document.");
      const buf = await res.arrayBuffer();
      const parsed = await parseDocx(buf, (p, l) => {
        setProgress(p);
        setProgressLabel(l);
      });
      setProgress(1);
      setProgressLabel("Done");
      setDoc(parsed, name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load sample.");
    } finally {
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
          {loading && (
            <div className="mx-auto mt-5 max-w-sm">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-150 ease-out"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
                <span>{progressLabel}</span>
                <span>{Math.round(progress * 100)}%</span>
              </div>
            </div>
          )}
        </label>

        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span>No file handy?</span>
          <button
            type="button"
            onClick={loadSample}
            disabled={loading}
            className="font-semibold text-primary underline-offset-4 hover:underline disabled:opacity-50"
          >
            Try with a sample document
          </button>
          <span>— you can replace it any time.</span>
        </div>

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
  const reset = useEditor((s) => s.reset);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <aside className="hidden w-72 shrink-0 flex-col border-r border-border bg-sidebar lg:flex">
        <div className="border-b border-border px-5 py-4">
          <button
            className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground"
            onClick={reset}
          >
            ← New file
          </button>
          <div className="mt-3 flex items-start gap-3">
            <div className="rounded-md bg-accent/70 p-2 text-primary-foreground">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{fileName}.docx</p>
              <p className="text-xs text-muted-foreground">
                {stats.words.toLocaleString()} words · {stats.paragraphs} paragraphs
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 divide-y divide-border overflow-y-auto py-2">
          <CleanupBar />
          <CharStylesPanel />
        </div>

        <div className="space-y-2 border-t border-border bg-sidebar-accent/60 px-5 py-4">
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

      <main
        className="flex h-full min-w-0 flex-1 flex-col overflow-hidden"
        onClick={() => setSelectedId(null)}
      >
        <header className="z-10 flex h-12 shrink-0 items-center justify-between border-b border-border bg-background/60 px-6 backdrop-blur">
          <div className="flex items-center gap-4">
            <h1 className="font-display text-sm font-bold tracking-tight">
              Document preview
            </h1>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Click any paragraph to edit it inline.
            </p>
          </div>
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
        </header>

        <div className="flex-1 overflow-hidden">
          <LivePreview selectedId={selectedId} onSelect={setSelectedId} />
        </div>
      </main>
    </div>
  );
}
