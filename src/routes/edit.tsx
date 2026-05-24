import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
import { CleanupBar } from "@/components/CleanupBar";
import { CharStylesPanel } from "@/components/CharStylesPanel";
import { LivePreview } from "@/components/LivePreview";
import { FileText, Download, FileCode2 } from "lucide-react";

export const Route = createFileRoute("/edit")({
  head: () => ({
    meta: [
      { title: "Editor — Word → InDesign Reformatter" },
      {
        name: "description",
        content: "Edit your document inline and export it ready for InDesign.",
      },
    ],
  }),
  component: EditPage,
});

function EditPage() {
  const navigate = useNavigate();
  const doc = useEditor((s) => s.doc);
  const fileName = useEditor((s) => s.fileName);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const stats = useMemo(() => {
    if (!doc) return { paragraphs: 0, words: 0 };
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
      <aside className="hidden w-72 shrink-0 flex-col border-r border-border bg-sidebar lg:flex">
        <div className="border-b border-border px-5 py-4">
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
