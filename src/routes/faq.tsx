import { createFileRoute, Link } from "@tanstack/react-router";

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is the Manuscript Formatting Tool?",
    a: "It's a browser-based tool that cleans up Word manuscripts and exports them as a print-ready .docx or InDesign Tagged Text file. It removes soft returns, fixes smart quotes, normalizes paragraph and character styles, and produces a file ready to flow into InDesign.",
  },
  {
    q: "Is it really free to try?",
    a: "Yes. You can upload a .docx, run cleanup, map styles, and preview the entire result for free. The only thing behind the paywall is the actual export button — you only pay when you're ready to download the cleaned file.",
  },
  {
    q: "What's the difference between the Day Pass and Lifetime Unlock?",
    a: "The $5 Day Pass gives you unlimited exports for 24 hours — perfect if you're formatting a single manuscript on a deadline. The $29 Lifetime Unlock is a one-time payment that gives you unlimited exports forever, including all future updates. There's no subscription on either plan.",
  },
  {
    q: "Is there a monthly subscription?",
    a: "No. Both paid options are one-time payments. We don't store your card and there's nothing to cancel.",
  },
  {
    q: "Does the tool upload my manuscript to a server?",
    a: "No. Parsing, cleanup, style mapping, preview, and export all run locally in your browser. Your manuscript never leaves your device. Only the purchase itself goes through our payment processor.",
  },
  {
    q: "What file formats does it accept?",
    a: "Microsoft Word .docx files. You can export back to a cleaned .docx or to InDesign Tagged Text (.txt with UTF-8 BOM) for direct import into Adobe InDesign.",
  },
  {
    q: "Will the export work in Adobe InDesign?",
    a: "Yes. The Tagged Text export maps paragraph and character styles to InDesign style names you choose, so the import respects your InDesign style sheet. The .docx export is also cleaned to import cleanly via File → Place.",
  },
  {
    q: "Can I get a refund?",
    a: "Yes. Refunds are handled by our payment processor, Paddle, within 30 days of purchase. Email us if you have any issue and we'll sort it out.",
  },
  {
    q: "Who is this tool for?",
    a: "Independent authors preparing a manuscript for print, editors who clean up author submissions, small presses and self-publishers laying out books in InDesign, and book designers who want messy Word files turned into clean style-mapped files.",
  },
  {
    q: "Do I need an InDesign license to use this tool?",
    a: "No. You can use it just to clean up Word files for print or for handing off to a designer. InDesign is only needed if you want to use the Tagged Text export inside InDesign.",
  },
];

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — Manuscript Formatting Tool for Authors & Editors" },
      {
        name: "description",
        content:
          "Answers about the manuscript formatter: pricing, .docx and InDesign Tagged Text exports, local processing, refunds, and how it works for authors and editors.",
      },
      {
        name: "keywords",
        content:
          "manuscript formatter faq, word to indesign questions, tagged text export, book manuscript formatting, indie author formatting, manuscript cleanup",
      },
      { property: "og:title", content: "Manuscript Formatting Tool — FAQ" },
      {
        property: "og:description",
        content:
          "Common questions about pricing, exports, file formats, and how the manuscript formatter works.",
      },
      { property: "og:url", content: "/faq" },
      { property: "og:type", content: "article" },
      { name: "twitter:title", content: "Manuscript Formatting Tool — FAQ" },
      {
        name: "twitter:description",
        content:
          "Pricing, exports, file formats, and how the manuscript formatter works.",
      },
    ],
    links: [{ rel: "canonical", href: "/faq" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: FAQPage,
});

function FAQPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto max-w-3xl px-6 pb-20 pt-16 sm:pt-24">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Frequently asked questions
        </p>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">
          Manuscript formatting, answered.
        </h1>
        <p className="mt-4 text-base text-muted-foreground">
          Everything authors, editors, and self-publishers ask before turning a
          messy Word file into a clean InDesign-ready manuscript.
        </p>

        <div className="mt-12 divide-y divide-border rounded-2xl border border-border bg-card">
          {FAQS.map((f, i) => (
            <details
              key={i}
              className="group px-6 py-5"
              open={i < 3}
            >
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
                <h2 className="font-display text-base font-semibold text-foreground">
                  {f.q}
                </h2>
                <span className="mt-1 text-muted-foreground transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {f.a}
              </p>
            </details>
          ))}
        </div>

        <div className="mt-12 rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Ready to try it?{" "}
          <Link to="/" className="text-primary underline">
            Open the tool
          </Link>{" "}
          or{" "}
          <Link to="/pricing" className="text-primary underline">
            view pricing
          </Link>
          .
        </div>
      </section>
    </main>
  );
}
