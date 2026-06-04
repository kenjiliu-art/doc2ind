import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Notice — Kenji Liu" },
      {
        name: "description",
        content:
          "Privacy notice for the Manuscript Formatting Tool. How Kenji Liu collects, uses, and protects your personal data.",
      },
      { property: "og:title", content: "Privacy Notice — Kenji Liu" },
      {
        property: "og:description",
        content:
          "Privacy notice for the Manuscript Formatting Tool.",
      },
      { property: "og:url", content: "/privacy" },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto max-w-3xl px-6 pb-20 pt-16 sm:pt-24">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Legal
        </p>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">
          Privacy Notice
        </h1>
        <p className="mt-4 text-base text-muted-foreground">
          Last updated: June 4, 2026
        </p>

        <div className="mt-10 space-y-10 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Who we are
            </h2>
            <p className="mt-2">
              This website and the Manuscript Formatting Tool are operated by{" "}
              <strong className="text-foreground">Kenji Liu</strong>, who is the
              data controller for your personal data. If you have questions
              about this notice, you can email us at{" "}
              <a
                href="mailto:hello@kenjiliu.com"
                className="text-primary underline"
              >
                hello@kenjiliu.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">
              What personal data we collect
            </h2>
            <p className="mt-2">
              We collect only the data necessary to provide the service:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong className="text-foreground">Account data:</strong> email
                address and authentication credentials when you create an
                account.
              </li>
              <li>
                <strong className="text-foreground">Usage data:</strong>{" "}
                information about how you interact with the tool (e.g. export
                events) to enforce access controls and improve the service.
              </li>
              <li>
                <strong className="text-foreground">Device & network
                data:</strong> IP address, browser type, and device identifiers
                for security and fraud prevention.
              </li>
              <li>
                <strong className="text-foreground">Support data:</strong>{" "}
                messages you send us when contacting support.
              </li>
            </ul>
            <p className="mt-2">
              We do <strong className="text-foreground">not</strong> collect or
              upload the content of your manuscript files. All document parsing,
              formatting, and export processing happens locally in your
              browser.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">
              How we use your data
            </h2>
            <p className="mt-2">
              We use your personal data for the following purposes:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                To create and manage your account and authenticate you
                (contract performance).
              </li>
              <li>
                To provide the manuscript formatting service and process your
                purchases (contract performance).
              </li>
              <li>
                To maintain security, prevent fraud, and protect the integrity
                of the service (legitimate interests).
              </li>
              <li>
                To respond to your support requests and communicate about your
                account (contract performance).
              </li>
              <li>
                To improve the tool based on aggregated, anonymized usage
                patterns (legitimate interests).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Legal basis for processing
            </h2>
            <p className="mt-2">
              We process personal data on the basis of: (1) contract performance
              — to deliver the service you signed up for; (2) legitimate
              interests — for security, fraud prevention, and service
              improvement; (3) legal obligation — where required by law; and
              (4) consent — where you have explicitly agreed (e.g. optional
              marketing communications).
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Who we share data with
            </h2>
            <p className="mt-2">
              We do not sell your personal data. We share it only with:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong className="text-foreground">Paddle</strong> — our
                Merchant of Record for payment processing, subscription
                management, tax compliance, and invoicing. Paddle acts as an
                independent data controller for payment-related data.
              </li>
              <li>
                <strong className="text-foreground">Hosting & infrastructure
                providers</strong> — to operate the website and store account
                data securely.
              </li>
              <li>
                <strong className="text-foreground">Professional advisers</strong>{" "}
                — legal and accounting professionals, where necessary.
              </li>
              <li>
                <strong className="text-foreground">Authorities</strong> — when
                required by law or to protect our rights.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Data retention
            </h2>
            <p className="mt-2">
              We keep your account data for as long as your account is active.
              If you delete your account, we remove your personal data within 30
              days, except where we are legally required to retain it (e.g.
              tax records). Usage logs are retained for up to 12 months for
              security and analytics, then deleted or anonymized.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Your rights
            </h2>
            <p className="mt-2">
              Depending on your location, you may have the right to:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Access the personal data we hold about you.</li>
              <li>Correct inaccurate or incomplete data.</li>
              <li>Request deletion of your data (right to be forgotten).</li>
              <li>Restrict or object to certain processing activities.</li>
              <li>Receive your data in a portable format.</li>
              <li>Withdraw consent where processing is based on consent.</li>
            </ul>
            <p className="mt-2">
              To exercise any of these rights, email us at{" "}
              <a
                href="mailto:hello@kenjiliu.com"
                className="text-primary underline"
              >
                hello@kenjiliu.com
              </a>
              . We will respond within one month.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Security
            </h2>
            <p className="mt-2">
              We use appropriate technical and organizational measures to
              protect your personal data, including encryption in transit
              (TLS/SSL), access controls, and regular security reviews. Your
              manuscript files are processed entirely in your browser and are
              never uploaded to our servers.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Cookies
            </h2>
            <p className="mt-2">
              We use essential cookies to keep you signed in and maintain
              session state. We do not use tracking or advertising cookies.
              You can disable cookies in your browser, but some features may
              not work correctly.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Changes to this notice
            </h2>
            <p className="mt-2">
              We may update this privacy notice from time to time. The latest
              version will always be posted on this page with the updated date.
              Continued use of the service after changes constitutes acceptance
              of the revised notice.
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
