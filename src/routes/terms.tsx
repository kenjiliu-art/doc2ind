import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — Kenji Liu" },
      {
        name: "description",
        content:
          "Terms and conditions for using the Manuscript Formatting Tool operated by Kenji Liu.",
      },
      { property: "og:title", content: "Terms & Conditions — Kenji Liu" },
      {
        property: "og:description",
        content:
          "Terms and conditions for using the Manuscript Formatting Tool.",
      },
      { property: "og:url", content: "/terms" },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: "/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto max-w-3xl px-6 pb-20 pt-16 sm:pt-24">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Legal
        </p>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">
          Terms & Conditions
        </h1>
        <p className="mt-4 text-base text-muted-foreground">
          Last updated: June 4, 2026
        </p>

        <div className="mt-10 space-y-10 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Introduction
            </h2>
            <p className="mt-2">
              These Terms & Conditions govern your use of the Manuscript
              Formatting Tool website and services, operated by{" "}
              <strong className="text-foreground">Kenji Liu</strong>. By
              accessing or using the service, you agree to be bound by these
              terms. If you do not agree, you must not use the service.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Acceptance of terms
            </h2>
            <p className="mt-2">
              By creating an account, making a purchase, or continuing to use
              the service, you confirm that you are at least 18 years old (or
              the age of legal majority in your jurisdiction) and have the
              authority to enter into these terms. If you are using the service
              on behalf of an organization, you confirm that you have
              authority to bind that organization to these terms.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">
              What the service provides
            </h2>
            <p className="mt-2">
              The Manuscript Formatting Tool is a browser-based application that
              cleans up Microsoft Word .docx files and exports them as print-ready
              .docx or InDesign Tagged Text files. The tool processes files
              entirely in your browser — your manuscript content is never
              uploaded to our servers.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Acceptable use
            </h2>
            <p className="mt-2">
              You agree not to misuse the service. Prohibited activities
              include:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                Using the service for any unlawful purpose or in violation of
                any applicable law.
              </li>
              <li>
                Attempting to interfere with, disrupt, or gain unauthorized
                access to the service or its underlying systems.
              </li>
              <li>
                Sending spam, phishing, or other unsolicited communications
                through the service.
              </li>
              <li>
                Infringing on the intellectual property rights of others.
              </li>
              <li>
                Reverse engineering, decompiling, or attempting to extract the
                source code of the service.
              </li>
              <li>
                Circumventing any technical limits or access controls, including
                payment gates.
              </li>
              <li>
                Using automated scripts, bots, or scrapers to access the service.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Intellectual property
            </h2>
            <p className="mt-2">
              Kenji Liu retains all ownership rights in the service, including
              its software, code, documentation, designs, and branding. You
              are granted a limited, non-exclusive, non-transferable right to
              use the service within the scope of your purchased plan. You
              retain all ownership rights in the manuscript files you upload
              and the output files you generate.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Payment terms
            </h2>
            <p className="mt-2">
              The service offers one-time payment options: a Day Pass and a
              Lifetime Unlock. Payment is processed by our online reseller,
              Paddle. All payment, billing, tax, cancellation, and refund
              mechanics are handled by Paddle. Please refer to{" "}
              <a
                href="https://www.paddle.com/legal/checkout-buyer-terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Paddle's Buyer Terms
              </a>{" "}
              for details.
            </p>
            <p className="mt-2">
              <strong className="text-foreground">Paddle Merchant of Record
              disclosure:</strong> Our order process is conducted by our online
              reseller Paddle.com. Paddle.com is the Merchant of Record for all
              our orders. Paddle provides all customer service inquiries and
              handles returns.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Service level
            </h2>
            <p className="mt-2">
              The service is provided "as is" and "as available." We do not
              guarantee that the service will be uninterrupted, error-free, or
              completely secure. We are not responsible for any loss of data
              or output resulting from browser crashes, network issues, or
              other factors outside our control. You are responsible for saving
              your work.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Account credentials
            </h2>
            <p className="mt-2">
              You are responsible for maintaining the confidentiality of your
              account credentials and for all activity that occurs under your
              account. You must notify us immediately if you suspect unauthorized
              access to your account.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Suspension and termination
            </h2>
            <p className="mt-2">
              We reserve the right to suspend or terminate your access to the
              service at any time, with or without notice, for:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Material breach of these terms.</li>
              <li>Non-payment or fraud.</li>
              <li>Security risks or suspected fraudulent activity.</li>
              <li>Repeated or serious violations of our acceptable use policy.</li>
            </ul>
            <p className="mt-2">
              Upon termination, your right to use the service ceases immediately.
              Provisions that by their nature should survive termination will
              continue to apply.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Limitation of liability
            </h2>
            <p className="mt-2">
              To the fullest extent permitted by law, Kenji Liu shall not be
              liable for any indirect, incidental, consequential, or special
              damages, including loss of profits, data, or goodwill, arising
              from your use of the service. Our total liability for any claim
              shall not exceed the amount you paid for the service in the 12
              months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Indemnity
            </h2>
            <p className="mt-2">
              You agree to indemnify and hold Kenji Liu harmless from any
              claims, damages, or expenses arising from your use of the service,
              your content, or your violation of these terms.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Governing law
            </h2>
            <p className="mt-2">
              These terms are governed by the laws of the State of California,
              USA, without regard to conflict of law principles. Any dispute
              arising from these terms shall be resolved in the courts of
              California.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Changes to these terms
            </h2>
            <p className="mt-2">
              We may update these terms from time to time. The latest version
              will always be posted on this page with the updated date.
              Continued use of the service after changes constitutes acceptance
              of the revised terms.
            </p>
          </section>
        </div>

        <div className="mt-12 rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Questions?{" "}
          <a
            href="mailto:hello@kenjiliu.com"
            className="text-primary underline"
          >
            Contact us
          </a>{" "}
          or{" "}
          <Link to="/faq" className="text-primary underline">
            read the FAQ
          </Link>
          .
        </div>
      </section>
    </main>
  );
}
