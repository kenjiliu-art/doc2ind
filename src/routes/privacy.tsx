import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Manuscript Formatting Tool" },
      {
        name: "description",
        content:
          "Privacy policy for the Manuscript Formatting Tool. Your documents are processed entirely in your browser and never uploaded.",
      },
      { property: "og:title", content: "Privacy Policy — Manuscript Formatting Tool" },
      {
        property: "og:description",
        content: "Your documents are processed entirely in your browser and never uploaded.",
      },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
  component: PrivacyPage,
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

function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-6 pb-20 pt-16">
        <h1 className="font-display text-4xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Operated by Kenji Liu · Last updated September 2026
        </p>

        <Section title="The short version">
          <p>
            This tool processes your documents entirely in your web browser.
            Your .docx files are never uploaded to a server, and we never see
            their contents.
          </p>
        </Section>

        <Section title="What data is collected">
          <p>
            <strong className="text-foreground">Your documents:</strong> none.
            Parsing, cleanup, preview, and export all run locally on your
            device using JavaScript in your browser.
          </p>
          <p>
            <strong className="text-foreground">Local storage:</strong> the
            tool may save your working session in your browser's local storage
            so you can restore it later. This data stays on your device and
            can be cleared at any time using the "Discard" option or your
            browser settings.
          </p>
          <p>
            <strong className="text-foreground">Accounts:</strong> there are
            none. No sign-up, no email address, no password.
          </p>
        </Section>

        <Section title="Third-party services">
          <p>
            The site loads fonts from Google Fonts, which may receive your IP
            address as part of serving the font files. No analytics,
            advertising, or tracking services are used.
          </p>
        </Section>

        <Section title="Data security and retention">
          <p>
            Because your documents never leave your device, there is nothing
            for us to secure, retain, or delete. Clearing your browser's local
            storage removes any saved session data.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            If this policy changes, the updated version will be posted on this
            page with a revised date.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about this policy can be sent via{" "}
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
