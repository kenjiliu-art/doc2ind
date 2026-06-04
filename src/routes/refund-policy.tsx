import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/refund-policy")({
  head: () => ({
    meta: [
      { title: "Refund Policy — Kenji Liu" },
      {
        name: "description",
        content:
          "Refund policy for the Manuscript Formatting Tool. 30-day money-back guarantee handled by Paddle.",
      },
      { property: "og:title", content: "Refund Policy — Kenji Liu" },
      {
        property: "og:description",
        content:
          "30-day money-back guarantee for the Manuscript Formatting Tool.",
      },
      { property: "og:url", content: "/refund-policy" },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: "/refund-policy" }],
  }),
  component: RefundPolicyPage,
});

function RefundPolicyPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto max-w-3xl px-6 pb-20 pt-16 sm:pt-24">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Legal
        </p>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">
          Refund Policy
        </h1>
        <p className="mt-4 text-base text-muted-foreground">
          Last updated: June 4, 2026
        </p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">
              30-day money-back guarantee
            </h2>
            <p className="mt-2">
              We want you to be fully satisfied with your purchase. If you are
              not happy with the Manuscript Formatting Tool for any reason,
              you can request a full refund within <strong className="text-foreground">30 days</strong> of your
              purchase date.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">
              How to request a refund
            </h2>
            <p className="mt-2">
              Refunds are processed by our payment provider, Paddle. You can
              request a refund in one of two ways:
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>
                Visit{" "}
                <a
                  href="https://paddle.net"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  paddle.net
                </a>{" "}
                and use their self-service refund tool with your order email.
              </li>
              <li>
                Email us at{" "}
                <a
                  href="mailto:hello@kenjiliu.com"
                  className="text-primary underline"
                >
                  hello@kenjiliu.com
                </a>{" "}
                with your transaction details and we will coordinate the refund
                with Paddle on your behalf.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Refund eligibility
            </h2>
            <p className="mt-2">
              All purchases of the Day Pass and Lifetime Unlock are eligible
              for a refund within the 30-day window, regardless of whether you
              have used the export feature. There are no restocking fees or
              hidden conditions.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Processing time
            </h2>
            <p className="mt-2">
              Refunds are typically processed within 5–10 business days and
              will be returned to your original payment method. The exact timing
              depends on your bank or card issuer.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">
              What happens after a refund
            </h2>
            <p className="mt-2">
              When a full refund is issued, your export access is revoked and
              your account reverts to the free tier. You can still use the tool
              to preview and format manuscripts, but exports will be disabled
              until a new purchase is made.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Contact us
            </h2>
            <p className="mt-2">
              If you have any questions about refunds or need help with your
              order, please reach out to{" "}
              <a
                href="mailto:hello@kenjiliu.com"
                className="text-primary underline"
              >
                hello@kenjiliu.com
              </a>
              . We are happy to help.
            </p>
          </section>
        </div>

        <div className="mt-12 rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Have questions?{" "}
          <Link to="/faq" className="text-primary underline">
            Read the FAQ
          </Link>{" "}
          or{" "}
          <a
            href="mailto:hello@kenjiliu.com"
            className="text-primary underline"
          >
            contact us
          </a>
          .
        </div>
      </section>
    </main>
  );
}
