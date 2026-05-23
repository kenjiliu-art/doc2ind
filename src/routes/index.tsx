import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { parseDocx } from "@/lib/docx-parse";
import { useEditor } from "@/store/editor";

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

function IndexPage() {
  const navigate = useNavigate();
  const setDoc = useEditor((s) => s.setDoc);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const buf = await file.arrayBuffer();
      const parsed = await parseDocx(buf);
      setDoc(parsed, file.name.replace(/\.docx$/i, ""));
      navigate({ to: "/edit" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to parse file.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-sidebar/60">
        <div className="mx-auto max-w-5xl px-6 py-5">
          <h1 className="font-display text-lg font-bold tracking-tight text-primary">
            Word → InDesign Reformatter
          </h1>
        </div>
      </header>

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


function Feature({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="font-medium">{title}</div>
      <div className="mt-1 text-muted-foreground">{children}</div>
    </div>
  );
}
