import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { getAccountOverview, deleteOwnAccount } from "@/lib/account.functions";
import { getPaddleEnvironment } from "@/lib/paddle";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Account — Manuscript Formatting Tool" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const env = getPaddleEnvironment();
  const fetchOverview = useServerFn(getAccountOverview);
  const deleteAccountFn = useServerFn(deleteOwnAccount);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login", replace: true });
  }, [user, authLoading, navigate]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["account-overview", user?.id, env],
    queryFn: () => fetchOverview({ data: { environment: env } }),
    enabled: !!user,
  });

  const onSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  const onDelete = async () => {
    setDeleting(true);
    try {
      await deleteAccountFn();
      await supabase.auth.signOut();
      toast.success("Account deleted");
      navigate({ to: "/", replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete account");
    } finally {
      setDeleting(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const ent = data?.entitlement;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PaymentTestModeBanner />
      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">Account</h1>
            <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted"
            >
              ← Back to tool
            </Link>
            <button
              onClick={onSignOut}
              className="rounded-md bg-foreground px-3 py-1.5 text-xs font-semibold text-background hover:opacity-90"
            >
              Sign out
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-10 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <>
            {/* Entitlement */}
            <section className="mt-8 rounded-xl border border-border bg-card p-6">
              <h2 className="font-display text-lg font-semibold">
                Current access
              </h2>
              {data?.isAdmin ? (
                <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">
                  Admin · unlimited exports
                </p>
              ) : ent?.kind === "lifetime" ? (
                <p className="mt-2 text-sm text-primary">
                  Lifetime Unlock — unlimited exports, no expiry.
                </p>
              ) : ent?.kind === "day_pass" ? (
                <p className="mt-2 text-sm text-primary">
                  Day Pass — active until{" "}
                  {new Date(ent.expiresAt!).toLocaleString()}
                </p>
              ) : (
                <div className="mt-2 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    No active export access.
                  </p>
                  <Link
                    to="/pricing"
                    className="inline-block rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
                  >
                    See pricing
                  </Link>
                </div>
              )}
            </section>

            {/* Purchase history */}
            <section className="mt-6 rounded-xl border border-border bg-card p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold">
                  Purchase history
                </h2>
                <button
                  onClick={() => refetch()}
                  className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
                >
                  Refresh
                </button>
              </div>
              {data && data.purchases.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  No purchases yet.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-border text-sm">
                  {data?.purchases.map((p: any) => (
                    <li
                      key={p.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-3"
                    >
                      <div>
                        <div className="font-medium text-foreground">
                          {p.kind === "lifetime"
                            ? "Lifetime Unlock"
                            : "Day Pass"}{" "}
                          {p.kind === "day_pass" &&
                            p.expires_at &&
                            new Date(p.expires_at).getTime() < Date.now() && (
                              <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                                Expired
                              </span>
                            )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(p.created_at).toLocaleString()} ·{" "}
                          <span className="font-mono">
                            {p.paddle_transaction_id}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-4 text-[11px] text-muted-foreground">
                Need a refund or receipt? Visit{" "}
                <a
                  href="https://paddle.net"
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  paddle.net
                </a>{" "}
                or email{" "}
                <a
                  href="mailto:hello@kenjiliu.com"
                  className="underline"
                >
                  hello@kenjiliu.com
                </a>{" "}
                with the transaction ID above.
              </p>
            </section>

            {/* Failures */}
            {data && data.failures.length > 0 && (
              <section className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-6">
                <h2 className="font-display text-lg font-semibold text-destructive">
                  Recent payment issues
                </h2>
                <ul className="mt-3 space-y-2 text-sm">
                  {data.failures.map((f: any) => (
                    <li key={f.id} className="text-destructive/90">
                      {new Date(f.created_at).toLocaleString()} —{" "}
                      <span className="font-mono">{f.reason}</span>
                      <div className="font-mono text-[11px] opacity-70">
                        {f.paddle_transaction_id}
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-muted-foreground">
                  Your card was declined or another error occurred. Try again
                  from the{" "}
                  <Link to="/pricing" className="underline">
                    pricing page
                  </Link>
                  .
                </p>
              </section>
            )}

            {/* Danger zone */}
            <section className="mt-10 rounded-xl border border-border p-6">
              <h2 className="font-display text-lg font-semibold">
                Delete account
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Permanently removes your account, purchase records, and export
                history from this tool. This does not refund any past
                purchases — request refunds at paddle.net first if needed.
              </p>
              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="mt-4 rounded-md border border-destructive/40 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10"
                >
                  Delete my account
                </button>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={onDelete}
                    disabled={deleting}
                    className="rounded-md bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    {deleting ? "Deleting…" : "Yes, delete permanently"}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
