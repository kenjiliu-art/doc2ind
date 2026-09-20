import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { parseDocx } from "@/lib/docx-parse";
import { useEditor } from "@/store/editor";
import { buildDocx } from "@/lib/docx-build";
import { buildTaggedText } from "@/lib/tagged-text";
import { CleanupBar } from "@/components/CleanupBar";
import { CharStylesPanel } from "@/components/CharStylesPanel";
import { StyleMappingPanel } from "@/components/StyleMappingPanel";
import { RenameStylesPanel } from "@/components/RenameStylesPanel";
import { DiagnosticsPanel } from "@/components/DiagnosticsPanel";
import { LivePreview, type PreviewFilter } from "@/components/LivePreview";
import { PreviewFilters } from "@/components/PreviewFilters";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { HealthRing } from "@/components/HealthRing";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { FileText, Download, FileCode2, Settings2, Undo2, Redo2, RotateCcw } from "lucide-react";
import type { Block, ParagraphBlock } from "@/lib/types";
import { loadSession, clearSession } from "@/lib/storage";
import { countIssuesDetailed, diffBreakdown, type IssueBreakdown } from "@/lib/health";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Manuscript Formatting Tool — Clean Word Files for InDesign" },
      {
        name: "description",
        content:
          "Free browser-based manuscript formatting tool. Clean up Word .docx files, fix styles, smart quotes, and soft returns, then export print-ready files or InDesign Tagged Text.",
      },
      {
        name: "keywords",
        content:
          "manuscript formatting, manuscript format, book manuscript formatting, novel formatting, Word to InDesign, docx to InDesign, InDesign import, tagged text export, paragraph styles, character styles, docx cleanup, smart quotes, soft returns",
      },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:title", content: "Manuscript Formatting Tool — Word to InDesign" },
      {
        property: "og:description",
        content:
          "Format your manuscript and prep .docx files for InDesign in the browser. Style mapping, cleanup rules, and tagged-text export — no upload.",
      },
      { property: "og:url", content: "/" },
      { name: "twitter:title", content: "Manuscript Formatting Tool" },
      {
        name: "twitter:description",
        content:
          "Format manuscripts and clean Word .docx files for InDesign — style mapping, cleanup, tagged-text export. In-browser, no upload.",
      },
    ],
    links: [{ rel: "canonical", href: "/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "Manuscript Formatting Tool",
          alternateName: "Word to InDesign Reformatter",
          applicationCategory: "DesignApplication",
          operatingSystem: "Web",
          description:
            "Browser-based manuscript formatting tool that cleans Microsoft Word .docx files for print and InDesign import, with paragraph/character style mapping and pre-import cleanup.",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          featureList: [
            "Manuscript formatting cleanup",
            "Paragraph and character style mapping",
            "Soft return to hard return conversion",
            "Smart quotes and dash normalization",
            "Tab and indent cleanup",
            "Pre-import diagnostics",
            "Tagged text export for InDesign",
          ],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "What is manuscript formatting?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Manuscript formatting is the process of cleaning up a Word document so it follows consistent paragraph and character styles, uses real returns instead of soft breaks, and is ready for typesetting in InDesign or submission to a publisher.",
              },
            },
            {
              "@type": "Question",
              name: "Does this upload my Word document to a server?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "No. Parsing, cleanup, and export all run locally in your browser. Your .docx never leaves your device.",
              },
            },
            {
              "@type": "Question",
              name: "What file formats are supported?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Import .docx files from Microsoft Word. Export cleaned .docx or InDesign tagged text (.txt).",
              },
            },
            {
              "@type": "Question",
              name: "Can I map Word styles to InDesign paragraph styles?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Yes. The style mapping panel lets you rename Word styles to match your InDesign paragraph and character style names before export.",
              },
            },
          ],
        }),
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

function toastExportSummary(
  initial: IssueBreakdown | null,
  current: IssueBreakdown,
  ext: string,
) {
  if (!initial || initial.total === 0) {
    toast.success(`Exported clean ${ext}`);
    return;
  }
  const d = diffBreakdown(initial, current);
  if (d.total === 0) {
    toast.success(`Exported ${ext} — no issues cleaned`);
    return;
  }

  const items: { label: string; count: number }[] = [
    { label: "soft breaks removed", count: d.softBreaks },
    { label: "tabs cleaned", count: d.tabs },
    { label: "straight quotes fixed", count: d.quotes },
    { label: "double hyphens fixed", count: d.dashes },
    { label: "extra spaces collapsed", count: d.multiSpaces },
    { label: "style bleed trimmed", count: d.bleed },
    { label: "empty paragraphs removed", count: d.empty },
    { label: "fonts normalized", count: d.fonts },
    { label: "styles mapped", count: d.unmapped },
  ].filter((i) => i.count > 0);

  toast.success(
    <div className="space-y-2">
      <div className="flex items-center gap-2 font-semibold text-emerald-900 dark:text-emerald-100">
        <span className="text-lg">🎉</span>
        <span>
          Exported {ext} — {d.total.toLocaleString()} issue{d.total === 1 ? "" : "s"} cleaned
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-emerald-800 dark:text-emerald-200">
        {items.map((i) => (
          <div key={i.label} className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="tabular-nums font-medium">{i.count.toLocaleString()}</span>
            <span className="opacity-80">{i.label}</span>
          </div>
        ))}
      </div>
      {current.total > 0 && (
        <div className="text-[11px] text-emerald-700/70 dark:text-emerald-300/70">
          {current.total.toLocaleString()} remaining — health score {Math.round((1 - current.total / initial.total) * 100)}
        </div>
      )}
    </div>,
  );
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
  const [restorable, setRestorable] = useState<{ fileName: string; savedAt: number } | null>(null);

  useEffect(() => {
    const snap = loadSession();
    if (snap) setRestorable({ fileName: snap.fileName, savedAt: snap.savedAt });
  }, []);

  const handleRestore = () => {
    const snap = loadSession();
    if (!snap) return;
    setDoc(snap.doc, snap.fileName);
    toast.success(`Restored "${snap.fileName}.docx"`);
  };

  const handleDiscardSaved = () => {
    clearSession();
    setRestorable(null);
  };

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
      <div className="mx-auto flex max-w-3xl items-center justify-end gap-2 px-6 pt-4">
        <Link
          to="/pricing"
          className="text-[11px] font-semibold text-muted-foreground hover:text-foreground"
        >
          Pricing
        </Link>
        <AccountLink />
      </div>
      <main className="mx-auto max-w-3xl px-6 pb-16 pt-8">
        <h1 className="font-display text-4xl font-bold tracking-tight text-balance">
          Manuscript formatting, done in your browser.
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
          Upload a Word <code className="rounded bg-muted px-1 font-mono text-foreground">.docx</code>.
          Clean up styles, returns, and quotes, then export a print-ready file or
          InDesign Tagged Text — everything runs locally, no upload.
        </p>


        {restorable && (
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
            <div className="flex items-center gap-3 text-sm">
              <RotateCcw className="h-4 w-4 text-primary" />
              <div>
                <div className="font-semibold text-foreground">
                  Restore last session?
                </div>
                <div className="text-xs text-muted-foreground">
                  {restorable.fileName}.docx · saved{" "}
                  {timeAgo(restorable.savedAt)}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleDiscardSaved}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted"
              >
                Discard
              </button>
              <button
                onClick={handleRestore}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
              >
                Restore
              </button>
            </div>
          </div>
        )}

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

        <div className="mt-4 text-center text-xs text-muted-foreground">
          <p>No file handy? Try a sample — you can replace it any time.</p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => loadSample("sample")}
              disabled={loading}
              className="rounded-md border border-accent bg-background px-3 py-1.5 font-semibold text-primary transition hover:bg-sidebar disabled:opacity-50"
            >
              Prose sample
            </button>
            <button
              type="button"
              onClick={() => loadSample("sample-poems")}
              disabled={loading}
              className="rounded-md border border-accent bg-background px-3 py-1.5 font-semibold text-primary transition hover:bg-sidebar disabled:opacity-50"
            >
              Three poems by Langston Hughes
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="mt-14">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            What it does
          </p>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <Feature title="Character styles">
              Bold, italic, super/subscript become named styles InDesign
              recognizes.
            </Feature>
            <Feature title="Line-by-line control">
              Toggle fixes per paragraph, edit inline, and apply changes in
              bulk.
            </Feature>
            <Feature title="Built-in cleanup">
              Fixes smart quotes, trims spaces, removes tracked changes, and
              cleans page breaks.
            </Feature>
            <Feature title="Two export formats">
              Clean .docx or InDesign Tagged Text — place and styles map
              automatically.
            </Feature>
          </div>
        </div>
      </main>
    </div>
  );
}

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function AccountLink() {
  const { user } = useAuth();
  if (!user) {
    return (
      <Link
        to="/login"
        className="rounded-md border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-muted"
      >
        Sign in
      </Link>
    );
  }
  return (
    <Link
      to="/account"
      title={user.email ?? "Account"}
      className="rounded-md border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-muted"
    >
      Account
    </Link>
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

const FILTER_BY_KEY: Record<string, PreviewFilter> = {
  "1": "all",
  "2": "warnings",
  "3": "changed",
  "4": "selected",
  "5": "headings",
  "6": "unstyled",
};

function EditorView() {
  const doc = useEditor((s) => s.doc)!;
  const fileName = useEditor((s) => s.fileName);
  const setDoc = useEditor((s) => s.setDoc);
  const reset = useEditor((s) => s.reset);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const selectionSize = useEditor((s) => s.selection.size);
  const clearSelection = useEditor((s) => s.clearSelection);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [sampleError, setSampleError] = useState<string | null>(null);
  const [previewFilter, setPreviewFilter] = useState<PreviewFilter>("all");
  const [showHiddenChars, setShowHiddenChars] = useState(false);

  const { sourceStyleCount, stats } = useMemo(() => {
    const sources = new Set<string>();
    let paragraphs = 0;
    let words = 0;
    const visit = (p: ParagraphBlock) => {
      sources.add(p.sourceStyle ?? "__unstyled__");
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
    const walk = (blocks: Block[]) => {
      for (const b of blocks) {
        if (b.kind === "paragraph") visit(b);
        else b.rows.forEach((r) => r.forEach((c) => c.paragraphs.forEach(visit)));
      }
    };
    walk(doc.blocks);
    return { sourceStyleCount: sources.size, stats: { paragraphs, words } };
  }, [doc.blocks]);

  const jumpAndCloseSheet = (id: string) => {
    setSelectedId(id);
    setMobileSheetOpen(false);
  };

  // Global keyboard shortcuts: Cmd/Ctrl+Z = undo, Shift+Cmd/Ctrl+Z or Ctrl+Y = redo,
  // Esc = clear selection, 1–6 = preview filter, H = toggle hidden chars.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inEditable =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          (target as HTMLElement).isContentEditable);
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        if (inEditable) return;
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        if (inEditable) return;
        e.preventDefault();
        redo();
        return;
      }
      if (e.key === "Escape") {
        if (selectionSize > 0) clearSelection();
        if (selectedId) setSelectedId(null);
      }
      if (!inEditable && !mod && !e.shiftKey && !e.altKey) {
        const next = FILTER_BY_KEY[e.key];
        if (next) {
          e.preventDefault();
          setPreviewFilter(next);
          return;
        }
        if (e.key.toLowerCase() === "h") {
          e.preventDefault();
          setShowHiddenChars((v) => !v);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, clearSelection, selectionSize, selectedId]);

  const initialBreakdown = useEditor((s) => s.initialIssueBreakdown);

  // --- Paywall / usage gating ---
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const getUsage = useServerFn(getUsageInfo);
  const recordExportFn = useServerFn(recordExport);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const paddleEnv = getPaddleEnvironment();

  const { data: usage } = useQuery({
    queryKey: ["usage", user?.id ?? "anon", paddleEnv],
    queryFn: () => getUsage({ data: { environment: paddleEnv } }),
    enabled: !!user,
    staleTime: 10_000,
    refetchInterval: (q) => (q.state.data?.hasAccess ? false : 5_000),
  });

  // Gate any export. Returns true if export may proceed (and records it).
  const gateExport = async (kind: string): Promise<boolean> => {
    if (authLoading) return false;
    if (!user) {
      setPaywallOpen(true);
      return false;
    }
    try {
      const res = await recordExportFn({ data: { kind, environment: paddleEnv } });
      queryClient.invalidateQueries({ queryKey: ["usage", user.id, paddleEnv] });
      if (!res.allowed) {
        setPaywallOpen(true);
        return false;
      }
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not verify export quota");
      return false;
    }
  };

  const onExportDocx = async () => {
    if (!(await gateExport("docx"))) return;
    const current = countIssuesDetailed(doc);
    const blob = await buildDocx(doc);
    saveAs(blob, `${fileName}-reformatted.docx`);
    toastExportSummary(initialBreakdown, current, ".docx");
  };
  const onExportTagged = async () => {
    if (!(await gateExport("tagged"))) return;
    const current = countIssuesDetailed(doc);
    const txt = buildTaggedText(doc);
    // BOM + octet-stream so Safari/Firefox force-download instead of opening inline,
    // and InDesign reads it as UTF-8 Tagged Text.
    const blob = new Blob(["\uFEFF", txt], { type: "application/octet-stream" });
    saveAs(blob, `${fileName}-tagged.txt`);
    toastExportSummary(initialBreakdown, current, ".txt");
  };
  const onDownloadChangelog = () => {
    const current = countIssuesDetailed(doc);
    if (!initialBreakdown) {
      toast.info("No baseline diagnostics captured yet.");
      return;
    }
    const d = diffBreakdown(initialBreakdown, current);
    const ts = new Date().toISOString();
    const lines = [
      `# Cleanup changelog — ${fileName}.docx`,
      `Generated: ${ts}`,
      ``,
      `Total issues at import: ${initialBreakdown.total.toLocaleString()}`,
      `Remaining issues now:   ${current.total.toLocaleString()}`,
      `Resolved:               ${d.total.toLocaleString()}`,
      ``,
      `## Issues resolved by category`,
      `- Soft breaks removed:        ${d.softBreaks}`,
      `- Multi-space runs cleaned:   ${d.multiSpaces}`,
      `- Leading tabs converted:     ${d.tabs}`,
      `- Double hyphens → em dashes: ${d.dashes}`,
      `- Straight quotes → curly:    ${d.quotes}`,
      `- Style bleed trimmed:        ${d.bleed}`,
      `- Empty paragraphs removed:   ${d.empty}`,
      `- Fonts normalized:           ${d.fonts}`,
      `- Source styles mapped:       ${d.unmapped}`,
    ];
    const blob = new Blob([lines.join("\n") + "\n"], {
      type: "text/markdown;charset=utf-8",
    });
    saveAs(blob, `${fileName}-changelog.md`);
    toast.success("Changelog saved");
  };

  const loadSample = async (name: string) => {
    setSampleLoading(true);
    setSampleError(null);
    try {
      const res = await fetch(`/${name}.docx`);
      if (!res.ok) throw new Error("Could not load sample document.");
      const buf = await res.arrayBuffer();
      const parsed = await parseDocx(buf, () => {});
      setDoc(parsed, name);
    } catch (e) {
      setSampleError(e instanceof Error ? e.message : "Failed to load sample.");
    } finally {
      setSampleLoading(false);
    }
  };

  const toolPanels = (onJump: (id: string) => void) => (
    <>
      <DiagnosticsPanel onJump={onJump} />
      <CollapsibleSection title="Preview filters">
        <PreviewFilters filter={previewFilter} onChange={setPreviewFilter} />
      </CollapsibleSection>
      <CollapsibleSection title="Auto-apply on import" defaultOpen>
        <CleanupBar />
      </CollapsibleSection>
      <CollapsibleSection title="Source style mapping" count={sourceStyleCount}>
        <StyleMappingPanel />
      </CollapsibleSection>
      <CollapsibleSection title="Paragraph styles" count={doc.paragraphStyles.length}>
        <RenameStylesPanel />
      </CollapsibleSection>
      <CollapsibleSection title="Character styles" count={doc.charStyles.length}>
        <CharStylesPanel />
      </CollapsibleSection>
    </>
  );

  const usageBadge = user ? (
    usage?.isAdmin ? (
      <div className="rounded-md bg-emerald-500/10 px-2 py-1 text-center text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
        Admin · unlimited exports
      </div>
    ) : usage?.hasAccess ? (
      <div className="rounded-md bg-primary/10 px-2 py-1 text-center text-[10px] font-semibold uppercase tracking-wider text-primary">
        {usage.entitlementKind === "lifetime"
          ? "Lifetime · unlimited"
          : `Day Pass · active${
              usage.entitlementExpiresAt
                ? ` until ${new Date(usage.entitlementExpiresAt).toLocaleString()}`
                : ""
            }`}
      </div>
    ) : usage ? (
      <button
        onClick={() => setPaywallOpen(true)}
        className="w-full rounded-md border border-dashed border-border px-2 py-1 text-center text-[10px] font-medium text-muted-foreground hover:border-primary hover:text-primary"
      >
        Free to try · unlock exports →
      </button>
    ) : null
  ) : (
    <div className="text-center text-[10px] text-muted-foreground">
      Free to try — sign in to unlock exports
    </div>
  );

  const exportButtons = (
    <>
      {usageBadge}
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
    </>
  );

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background text-foreground">
      <PaymentTestModeBanner />
      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} />
      <div className="flex flex-1 overflow-hidden">
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
          {toolPanels(setSelectedId)}
        </div>

        <div className="space-y-2 border-t border-border bg-sidebar-accent/60 px-5 py-4">
          <HealthRing />
          {exportButtons}
          <button
            onClick={onDownloadChangelog}
            className="flex w-full items-center justify-center gap-1.5 text-[11px] font-medium text-muted-foreground transition hover:text-primary"
          >
            <Download className="h-3 w-3" />
            Save cleanup changelog (.md)
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
              Click to edit · Shift-click to range-select · ⌘Z to undo
            </p>
          </div>
          <div className="flex items-center gap-2">
            <AccountLink />

            <div className="flex items-center gap-0.5 rounded-md border border-border bg-background p-0.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  undo();
                }}
                disabled={!canUndo}
                title="Undo (⌘Z)"
                aria-label="Undo"
                className="rounded p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-30"
              >
                <Undo2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  redo();
                }}
                disabled={!canRedo}
                title="Redo (⇧⌘Z)"
                aria-label="Redo"
                className="rounded p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-30"
              >
                <Redo2 className="h-3.5 w-3.5" />
              </button>
            </div>
            {selectionSize > 0 && (
              <span className="hidden rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary sm:inline-flex">
                {selectionSize} selected
              </span>
            )}
            <div className="flex items-center gap-2 lg:hidden">
              <button
                onClick={onExportTagged}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
              >
                Tagged
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

        <div className="flex-1 overflow-hidden">
          <LivePreview
            selectedId={selectedId}
            onSelect={setSelectedId}
            filter={previewFilter}
            showHiddenChars={showHiddenChars}
            onToggleHiddenChars={() => setShowHiddenChars((v) => !v)}
          />
        </div>

        {/* Mobile-only tools FAB + bottom sheet */}
        <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
          <SheetTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              aria-label="Open tools"
              className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition active:scale-95 lg:hidden"
            >
              <Settings2 className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[85vh] flex-col gap-0 rounded-t-2xl p-0 lg:hidden"
          >
            <div className="flex items-start justify-between border-b border-border px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="rounded-md bg-accent/70 p-2 text-primary-foreground">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{fileName}.docx</p>
                  <p className="text-xs text-muted-foreground">
                    {stats.words.toLocaleString()} words · {stats.paragraphs} paragraphs
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <button
                      className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground"
                      onClick={reset}
                    >
                      ← New file
                    </button>
                    <span className="text-[10px] text-muted-foreground">or load sample:</span>
                    <button
                      type="button"
                      disabled={sampleLoading}
                      onClick={() => loadSample("sample")}
                      className="text-[10px] font-semibold text-primary underline-offset-2 hover:underline disabled:opacity-50"
                    >
                      Prose
                    </button>
                    <button
                      type="button"
                      disabled={sampleLoading}
                      onClick={() => loadSample("sample-poems")}
                      className="text-[10px] font-semibold text-primary underline-offset-2 hover:underline disabled:opacity-50"
                    >
                      Poems
                    </button>
                  </div>
                  {sampleError && (
                    <p className="mt-1 text-[10px] text-destructive">{sampleError}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex-1 divide-y divide-border overflow-y-auto">
              {toolPanels(jumpAndCloseSheet)}
            </div>

            <div className="space-y-2 border-t border-border bg-sidebar-accent/60 px-5 py-4">
              <HealthRing compact />
              {exportButtons}
            </div>
          </SheetContent>
        </Sheet>
      </main>
      </div>
    </div>
  );
}
