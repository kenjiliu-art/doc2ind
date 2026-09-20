import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Manuscript Formatting Tool" },
      {
        name: "description",
        content:
          "Terms of service for the Manuscript Formatting Tool, a free browser-based Word-to-InDesign cleanup utility.",
      },
      { property: "og:title", content: "Terms of Service — Manuscript Formatting Tool" },
      {
        property: "og:description",
        content: "Terms for using the free browser-based manuscript formatting tool.",
      },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: "/terms" }],
  }),
  component: TermsPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-xl font-semibold text-foreground">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

function TermsPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-6 pb-20 pt-16">
        <h1 className="font-display text-4xl font-bold tracking-tight">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Operated by Kenji Liu · Last updated September 2026
        </p>

        <Section title="Acceptance of terms">
          <p>
            By using this website and tool (the "Service"), operated by Kenji
            Liu, you agree to these terms. If you do not agree, please do not
            use the Service.
          </p>
        </Section>

        <Section title="The Service">
          <p>
            The Service is a free, browser-based tool that cleans up Microsoft
            Word .docx files and exports print-ready documents or InDesign
            Tagged Text. All processing happens locally in your browser; your
            documents are never uploaded.
          </p>
          <p>
            The Service is provided free of charge. There are no accounts, no
            subscriptions, and no payments.
          </p>
        </Section>

        <Section title="Acceptable use">
          <p>You agree not to:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Use the Service for any unlawful purpose.</li>
            <li>
              Attempt to disrupt, overload, or reverse-engineer the hosting
              infrastructure.
            </li>
            <li>
              Misrepresent the Service or its output as your own software
              product.
            </li>
          </ul>
        </Section>

        <Section title="Your content">
          <p>
            You retain all rights to documents you process with the Service.
            Because files are processed locally in your browser, we never
            access, store, or claim any rights over your content.
          </p>
        </Section>

        <Section title="Intellectual property">
          <p>
            The Service itself — its design, code, and branding — is owned by
            Kenji Liu. You may use the output it produces (cleaned documents,
            tagged text) freely, for any purpose.
          </p>
        </Section>

        <Section title="Disclaimer of warranties">
          <p>
            The Service is provided "as is" and "as available", without
            warranties of any kind, express or implied. While the tool is
            designed to produce clean, well-structured files, you are
            responsible for reviewing exported documents before publishing or
            printing them.
          </p>
        </Section>

        <Section title="Limitation of liability">
          <p>
            To the maximum extent permitted by law, Kenji Liu shall not be
            liable for any indirect, incidental, or consequential damages
            arising from use of the Service, including lost data, lost
            profits, or publishing errors.
          </p>
        </Section>

        <Section title="Changes and termination">
          <p>
            These terms may be updated from time to time; the current version
            will always be posted on this page. The Service may be modified,
            suspended, or discontinued at any time without notice.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about these terms can be sent via{" "}
            <a
              href="https://kenjiliu.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              kenjiliu.com
            </a>
            .
          </p>
        </Section>
      </div>
    </main>
  );
}
