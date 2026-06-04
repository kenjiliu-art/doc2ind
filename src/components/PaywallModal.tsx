import { useState, useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { initializePaddle, getPaddlePriceId, getPaddleEnvironment } from "@/lib/paddle";
import { Loader2, Check } from "lucide-react";
import { toast } from "sonner";

export type PlanId = "day_pass_one_time" | "lifetime_one_time";

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  preselectedPlan?: PlanId;
}

const PLANS: Array<{
  id: PlanId;
  name: string;
  price: string;
  tagline: string;
  features: string[];
  highlight?: boolean;
}> = [
  {
    id: "day_pass_one_time",
    name: "Day Pass",
    price: "$5",
    tagline: "24 hours of unlimited exports",
    features: [
      "Unlimited .docx & Tagged Text exports",
      "Active for 24 hours from purchase",
      "Best for a one-off manuscript",
    ],
  },
  {
    id: "lifetime_one_time",
    name: "Lifetime Unlock",
    price: "$29",
    tagline: "One payment, unlimited forever",
    features: [
      "Unlimited exports, no expiry",
      "All future updates included",
      "No subscription, ever",
    ],
    highlight: true,
  },
];

export function PaywallModal({ open, onClose, preselectedPlan }: PaywallModalProps) {
  const { user } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [autoCheckoutPlan, setAutoCheckoutPlan] = useState<PlanId | null>(null);
  const hasTriggered = useRef(false);

  useEffect(() => {
    if (open && preselectedPlan && user && !hasTriggered.current) {
      hasTriggered.current = true;
      setAutoCheckoutPlan(preselectedPlan);
      handleCheckout(preselectedPlan);
    }
    if (!open) {
      hasTriggered.current = false;
      setAutoCheckoutPlan(null);
    }
  }, [open, preselectedPlan, user]);

  if (!open) return null;

  const handleCheckout = async (priceId: PlanId) => {
    if (!user) return;
    setLoadingPlan(priceId);
    try {
      await initializePaddle();
      const paddlePriceId = await getPaddlePriceId(priceId);
      window.Paddle.Checkout.open({
        items: [{ priceId: paddlePriceId, quantity: 1 }],
        customer: user.email ? { email: user.email } : undefined,
        customData: { userId: user.id },
        settings: {
          displayMode: "overlay",
          successUrl: `${window.location.origin}/?checkout=success`,
          allowLogout: false,
          variant: "one-page",
        },
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open checkout");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-8 shadow-2xl">
        {!user ? (
          <>
            <h2 className="font-display text-2xl font-bold text-foreground">
              Create an account to export
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              The tool is free to try — sign in to unlock exports. One-time
              purchase, no subscription.
            </p>
            <div className="mt-6 flex gap-2">
              <Link
                to="/login"
                className="flex-1 rounded-md bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                Sign in / Sign up
              </Link>
              <button
                onClick={onClose}
                className="rounded-md border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted"
              >
                Not now
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">
                  Unlock exports
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  One-time payment. No subscription. Cancel-proof.
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative flex flex-col rounded-xl border p-5 ${
                    plan.highlight
                      ? "border-primary bg-primary/5"
                      : "border-border bg-background"
                  }`}
                >
                  {plan.highlight && (
                    <div className="absolute -top-2 right-4 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                      Best value
                    </div>
                  )}
                  <div className="font-display text-lg font-bold text-foreground">
                    {plan.name}
                  </div>
                  <div className="mt-1 text-3xl font-bold text-foreground">
                    {plan.price}
                  </div>
                  <div className="text-xs text-muted-foreground">{plan.tagline}</div>
                  <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handleCheckout(plan.id)}
                    disabled={loadingPlan !== null}
                    className={`mt-5 flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${
                      plan.highlight
                        ? "bg-primary text-primary-foreground hover:opacity-90"
                        : "border border-border bg-background text-foreground hover:bg-muted"
                    }`}
                  >
                    {loadingPlan === plan.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      `Get ${plan.name}`
                    )}
                  </button>
                </div>
              ))}
            </div>

            <p className="mt-5 text-center text-[11px] text-muted-foreground">
              Signed in as <span className="font-mono">{user.email}</span> ·
              Payments processed by Paddle
              {getPaddleEnvironment() === "sandbox" && " (test mode)"}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
