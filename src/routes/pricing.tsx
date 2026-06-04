import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, X } from "lucide-react";
import { PaywallModal, type PlanId } from "@/components/PaywallModal";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Manuscript Formatting Tool ($5 Day Pass, $29 Lifetime)" },
      {
        name: "description",
        content:
          "Free to try with no exports. Unlock exports with a $5 Day Pass (24h unlimited) or $29 Lifetime Unlock (one-time, forever). No subscription.",
      },
      {
        name: "keywords",
        content:
          "manuscript formatter pricing, word to indesign pricing, day pass, lifetime unlock, one-time payment, no subscription manuscript tool",
      },
      { property: "og:title", content: "Pricing — Manuscript Formatting Tool" },
      {
        property: "og:description",
        content:
          "Free to try. $5 Day Pass or $29 Lifetime Unlock. One-time payment, no subscription.",
      },
      { property: "og:url", content: "/pricing" },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "Pricing — Manuscript Formatting Tool" },
      {
        name: "twitter:description",
        content: "$5 Day Pass or $29 Lifetime Unlock. No subscription.",
      },
    ],
    links: [{ rel: "canonical", href: "/pricing" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          name: "Manuscript Formatting Tool",
          description:
            "Browser-based manuscript formatter that cleans Word files and exports to .docx or InDesign Tagged Text.",
          brand: { "@type": "Brand", name: "Manuscript Formatting Tool" },
          offers: [
            {
              "@type": "Offer",
              name: "Free to Try",
              price: "0",
              priceCurrency: "USD",
              description:
                "Full access to the tool with no exports. Clean, preview, and map styles for free.",
            },
            {
              "@type": "Offer",
              name: "Day Pass",
              price: "5",
              priceCurrency: "USD",
              description: "24 hours of unlimited exports.",
            },
            {
              "@type": "Offer",
              name: "Lifetime Unlock",
              price: "29",
              priceCurrency: "USD",
              description:
                "Unlimited exports forever. One payment, no subscription.",
            },
          ],
        }),
      },
    ],
  }),
  component: PricingPage,
});

type Tier = {
  name: string;
  price: string;
  cadence: string;
  tagline: string;
  cta: string;
  highlight?: boolean;
  planId?: PlanId;
  features: { label: string; included: boolean }[];
};

const TIERS: Tier[] = [
  {
    name: "Free to Try",
    price: "$0",
    cadence: "forever",
    tagline: "Full tool, no exports.",
    cta: "Start free",
    features: [
      { label: "Upload & parse .docx in browser", included: true },
      { label: "Diagnostics & cleanup preview", included: true },
      { label: "Style mapping & rename", included: true },
      { label: "Local processing — no upload", included: true },
      { label: "Export to .docx", included: false },
      { label: "Export InDesign Tagged Text", included: false },
    ],
  },
  {
    name: "Day Pass",
    price: "$5",
    cadence: "one-time, 24h",
    tagline: "One manuscript, done today.",
    cta: "Export with Day Pass",
    planId: "day_pass_one_time" as PlanId,
    features: [
      { label: "Everything in Free to Try", included: true },
      { label: "Unlimited .docx exports for 24h", included: true },
      { label: "Unlimited Tagged Text exports for 24h", included: true },
      { label: "Best for a single book deadline", included: true },
      { label: "Lifetime access", included: false },
      { label: "Future updates included forever", included: false },
    ],
  },
  {
    name: "Lifetime Unlock",
    price: "$29",
    cadence: "one-time, forever",
    tagline: "One payment. Done.",
    cta: "Unlock Lifetime",
    planId: "lifetime_one_time" as PlanId,
    highlight: true,
    features: [
      { label: "Everything in Day Pass", included: true },
      { label: "Unlimited exports forever", included: true },
      { label: "All future updates included", included: true },
      { label: "No subscription, ever", included: true },
      { label: "Best for working authors & editors", included: true },
      { label: "One payment, never expires", included: true },
    ],
  },
];

function PricingPage() {
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [preselectedPlan, setPreselectedPlan] = useState<PlanId | undefined>(
    undefined,
  );

  const openPaywall = (plan: PlanId) => {
    setPreselectedPlan(plan);
    setPaywallOpen(true);
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-16 sm:pt-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Pricing
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Free to try. Pay once to export.
          </h1>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Use the full formatter in your browser for free. When you're ready
            to ship the file, unlock exports with a one-time payment — no
            subscription.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`relative flex flex-col rounded-2xl border p-7 ${
                tier.highlight
                  ? "border-primary bg-primary/5 shadow-lg"
                  : "border-border bg-card"
              }`}
            >
              {tier.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                  Best value
                </div>
              )}
              <div className="font-display text-xl font-bold">{tier.name}</div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-4xl font-bold">{tier.price}</span>
                <span className="text-xs text-muted-foreground">
                  {tier.cadence}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {tier.tagline}
              </p>

              <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                {tier.features.map((f) => (
                  <li key={f.label} className="flex items-start gap-2">
                    {f.included ? (
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    ) : (
                      <X className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" />
                    )}
                    <span
                      className={
                        f.included
                          ? "text-foreground"
                          : "text-muted-foreground/60 line-through"
                      }
                    >
                      {f.label}
                    </span>
                  </li>
                ))}
              </ul>

              {tier.planId ? (
                <button
                  type="button"
                  onClick={() => openPaywall(tier.planId!)}
                  className={`mt-7 rounded-md px-4 py-2.5 text-center text-sm font-semibold transition ${
                    tier.highlight
                      ? "bg-primary text-primary-foreground hover:opacity-90"
                      : "border border-border bg-background text-foreground hover:bg-muted"
                  }`}
                >
                  {tier.cta}
                </button>
              ) : (
                <Link
                  to="/"
                  className={`mt-7 rounded-md px-4 py-2.5 text-center text-sm font-semibold transition ${
                    tier.highlight
                      ? "bg-primary text-primary-foreground hover:opacity-90"
                      : "border border-border bg-background text-foreground hover:bg-muted"
                  }`}
                >
                  {tier.cta}
                </Link>
              )}
            </div>
          ))}
        </div>

        <div className="mx-auto mt-16 max-w-3xl rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          <h2 className="font-display text-lg font-semibold text-foreground">
            How it compares
          </h2>
          <p className="mt-2">
            Most manuscript formatting tools lock you into a $10–25/month
            subscription. Pay $29 once here and you're done — no renewal, no
            credit card on file, no "we raised prices" email.
          </p>
        </div>

        <div className="mt-10 text-center text-sm text-muted-foreground">
          Questions?{" "}
          <Link to="/faq" className="text-primary underline">
            Read the FAQ
          </Link>{" "}
          or{" "}
          <a href="mailto:hello@kenjiliu.com" className="text-primary underline">
            email us
          </a>
          .
        </div>
      </section>

      <PaywallModal
        open={paywallOpen}
        onClose={() => {
          setPaywallOpen(false);
          setPreselectedPlan(undefined);
        }}
        preselectedPlan={preselectedPlan}
      />
    </main>
  );
}
