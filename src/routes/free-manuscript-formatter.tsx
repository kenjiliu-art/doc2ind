import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, Sparkles, ShieldCheck, Download, Wand2, FileCode2 } from "lucide-react";

export const Route = createFileRoute("/free-manuscript-formatter")({
  head: () => ({
    meta: [
      { title: "Free Manuscript Formatter — Format Your Book in the Browser" },
      {
        name: "description",
        content:
          "A free manuscript formatter for novelists and authors. Clean Word .docx files, fix soft returns, smart quotes, and tabs, and export a print-ready manuscript — no signup, no upload.",
      },
      {
        name: "keywords",
        content:
          "free manuscript formatter, manuscript formatter, book manuscript formatter, novel manuscript formatter, format manuscript online, free book formatting tool, docx manuscript formatter",
      },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:title", content: "Free Manuscript Formatter" },
      {
        property: "og:description",
        content:
          "Format your book manuscript free in the browser. Cleans Word .docx, fixes soft returns, smart quotes, tabs, and exports print-ready files.",
      },
      { property: "og:url", content: "/free-manuscript-formatter" },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "Free Manuscript Formatter" },
      {
        name: "twitter:description",
        content:
          "Free in-browser manuscript formatter for authors. Cleans .docx, fixes returns, quotes, tabs. No signup, no upload.",
      },
    ],
    links: [{ rel: "canonical", href: "/free-manuscript-formatter" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "Free Manuscript Formatter",
          applicationCategory: "DesignApplication",
          operatingSystem: "Web",
          description:
            "Free browser-based manuscript formatter for authors and novelists. Cleans Word .docx files and exports print-ready manuscripts or InDesign tagged text.",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          aggregateRating: undefined,
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
              name: "Is this manuscript formatter really free?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Yes. You can upload a .docx, clean it, and export a formatted manuscript without paying or creating an account. Heavy users can unlock unlimited exports, but the formatter itself is free to use.",
              },
            },
            {
              "@type": "Question",
              name: "What does a manuscript formatter actually do?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "It normalizes a Word document so it follows clean paragraph styles, removes soft line breaks and stray tabs, converts straight quotes to smart quotes, and produces a file that's ready for print, agent submission, or InDesign import.",
              },
            },
            {
              "@type": "Question",
              name: "Do I need Microsoft Word or InDesign to use it?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "No. The tool runs entirely in your browser. You only need a .docx file. Exports come back as a cleaned .docx you can open in any word processor, or as InDesign Tagged Text if you're laying the book out yourself.",
              },
            },
            {
              "@type": "Question",
              name: "Is my manuscript safe?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Yes. Your file is parsed and cleaned locally in your browser. Nothing is uploaded to a server.",
              },
            },
          ],
        }),
      },
    ],
  }),
  component: FreeManuscriptFormatterPage,
});

function FreeManuscriptFormatterPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16 text-foreground">
      <header className="mb-12 text-center">
        <p className="mb-3 inline-block rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Free · Runs in your browser
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Free manuscript formatter for authors
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Drop in a Word .docx. We clean up the messy stuff — soft returns, double spaces,
          mismatched styles, straight quotes — and hand you back a print-ready manuscript.
          No signup, no upload.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <FileText className="h-4 w-4" /> Format my manuscript
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 rounded-md border border-border px-5 py-2.5 text-sm font-medium hover:bg-muted"
          >
            How it works
          </a>
        </div>
      </header>

      <section className="grid gap-6 sm:grid-cols-3" aria-label="Features">
        <Feature
          icon={<Wand2 className="h-5 w-5" />}
          title="One-click cleanup"
          body="Soft returns become real paragraphs. Tabs and double spaces vanish. Straight quotes and double hyphens get fixed."
        />
        <Feature
          icon={<ShieldCheck className="h-5 w-5" />}
          title="Private by default"
          body="Your manuscript never leaves your device. Parsing, cleanup, and export all run in the browser."
        />
        <Feature
          icon={<Download className="h-5 w-5" />}
          title="Print-ready exports"
          body="Download a cleaned .docx for agents and printers, or InDesign Tagged Text for typesetting."
        />
      </section>

      <section id="how-it-works" className="mt-16">
        <h2 className="text-2xl font-semibold tracking-tight">How the formatter works</h2>
        <ol className="mt-6 space-y-4 text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">1. Drop in your .docx.</span> Manuscripts
            from Word, Google Docs, Scrivener, and Pages all work as long as they export to .docx.
          </li>
          <li>
            <span className="font-medium text-foreground">2. Review detected issues.</span> The tool
            flags chapter headings, blank-line spacers, tab indents, and any styles that don't match
            a standard manuscript layout.
          </li>
          <li>
            <span className="font-medium text-foreground">3. Apply cleanup rules.</span> Convert
            soft breaks to real paragraphs, normalize quotes and dashes, strip extra spaces, and
            re-map paragraph styles in one pass.
          </li>
          <li>
            <span className="font-medium text-foreground">4. Export a clean file.</span> Download a
            print-ready .docx — or InDesign Tagged Text if you're laying out the book yourself.
          </li>
        </ol>
      </section>

      <section className="mt-16">
        <h2 className="text-2xl font-semibold tracking-tight">Who it's for</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <Card
            icon={<FileText className="h-5 w-5" />}
            title="Novelists & indie authors"
            body="Get your manuscript into standard format before sending it to agents, beta readers, or KDP."
          />
          <Card
            icon={<FileCode2 className="h-5 w-5" />}
            title="Designers & typesetters"
            body="Hand-off ready files. Style mapping and tagged-text export skip the manual cleanup in InDesign."
          />
          <Card
            icon={<Sparkles className="h-5 w-5" />}
            title="Editors"
            body="Receive consistent .docx from every client. No more re-fixing the same five problems by hand."
          />
          <Card
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Anyone with a messy Word doc"
            body="If your document has soft breaks, stray tabs, or 14 different fonts — the formatter fixes it."
          />
        </div>
      </section>

      <section className="mt-16">
        <h2 className="text-2xl font-semibold tracking-tight">Frequently asked questions</h2>
        <dl className="mt-6 space-y-6 text-muted-foreground">
          <Faq
            q="Is this manuscript formatter really free?"
            a="Yes. You can upload, clean, and export a manuscript without paying or signing up. Heavy users can unlock unlimited exports, but the formatter itself is free."
          />
          <Faq
            q="What does a manuscript formatter actually do?"
            a="It normalizes a Word document so it follows clean paragraph styles, removes soft line breaks and stray tabs, converts straight quotes to smart quotes, and produces a file that's ready for print, agent submission, or InDesign import."
          />
          <Faq
            q="Do I need Word or InDesign to use it?"
            a="No. The tool runs entirely in your browser. You only need a .docx file. Exports come back as a cleaned .docx or as InDesign Tagged Text."
          />
          <Faq
            q="Is my manuscript safe?"
            a="Yes. Your file is parsed and cleaned locally in your browser. Nothing is uploaded to a server."
          />
        </dl>
      </section>

      <section className="mt-20 rounded-xl border border-border bg-muted/30 p-8 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Format your manuscript now</h2>
        <p className="mt-2 text-muted-foreground">
          Free, in-browser, no signup. Your file never leaves your device.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <FileText className="h-4 w-4" /> Open the formatter
        </Link>
      </section>
    </main>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-lg border border-border p-5">
      <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="font-medium">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function Card({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-lg border border-border p-5">
      <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="font-medium">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <div>
      <dt className="font-medium text-foreground">{q}</dt>
      <dd className="mt-1">{a}</dd>
    </div>
  );
}
