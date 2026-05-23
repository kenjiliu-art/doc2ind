import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { saveAs } from "file-saver";
import { useEditor } from "@/store/editor";
import { buildDocx } from "@/lib/docx-build";
import { buildTaggedText } from "@/lib/tagged-text";
import { ParagraphRow } from "@/components/ParagraphRow";
import { TableRow as TableRowView } from "@/components/TableRow";
import { StylePanel } from "@/components/StylePanel";
import { BulkActionsBar } from "@/components/BulkActionsBar";
import { CleanupBar } from "@/components/CleanupBar";

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

  const allParagraphIds = useMemo(() => {
    if (!doc) return [];
    const ids: string[] = [];
    doc.blocks.forEach((b) => {
      if (b.kind === "paragraph") ids.push(b.id);
      else
        b.rows.forEach((r) =>
          r.forEach((c) => c.paragraphs.forEach((p) => ids.push(p.id))),
        );
    });
    return ids;
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
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-3">
            <button
              className="text-sm text-muted-foreground hover:text-foreground"
              onClick={() => navigate({ to: "/" })}
            >
              ← New file
            </button>
            <span className="text-sm font-medium">{fileName}.docx</span>
            <span className="text-xs text-muted-foreground">
              {allParagraphIds.length} paragraphs
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onExportTagged}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent"
            >
              Export Tagged Text
            </button>
            <button
              onClick={onExportDocx}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Export .docx
            </button>
          </div>
        </div>
        <CleanupBar />
        <BulkActionsBar />
      </header>

      <div className="mx-auto flex w-full max-w-[1600px] flex-1 gap-6 px-6 py-6">
        <main className="min-w-0 flex-1 space-y-1">
          {doc.blocks.map((b) =>
            b.kind === "paragraph" ? (
              <ParagraphRow key={b.id} paragraph={b} />
            ) : (
              <TableRowView key={b.id} table={b} />
            ),
          )}
        </main>
        <aside className="hidden w-80 shrink-0 lg:block">
          <div className="sticky top-32">
            <StylePanel />
          </div>
        </aside>
      </div>
    </div>
  );
}
