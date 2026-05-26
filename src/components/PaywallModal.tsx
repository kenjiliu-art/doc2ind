import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  used: number;
  limit: number;
}

export function PaywallModal({ open, onClose, used, limit }: PaywallModalProps) {
  const { user } = useAuth();
  if (!open) return null;

  const isOverLimit = used >= limit;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-2xl">
        {!user ? (
          <>
            <h2 className="font-display text-2xl font-bold text-foreground">
              Sign in to export
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Create a free account to export up to {limit} documents.
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
        ) : isOverLimit ? (
          <>
            <h2 className="font-display text-2xl font-bold text-foreground">
              You've used all {limit} free exports
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Thanks for trying the reformatter! To keep exporting, upgrade to
              a paid plan. Get in touch and we'll set you up.
            </p>
            <div className="mt-6 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
              Signed in as <span className="font-mono">{user.email}</span>
            </div>
            <div className="mt-6 flex gap-2">
              <a
                href="mailto:hello@kenjiliu.com?subject=Word2InDesign%20upgrade"
                className="flex-1 rounded-md bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                Contact to upgrade
              </a>
              <button
                onClick={() => supabase.auth.signOut()}
                className="rounded-md border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted"
              >
                Sign out
              </button>
            </div>
            <button
              onClick={onClose}
              className="mt-3 w-full text-center text-xs text-muted-foreground hover:text-foreground"
            >
              Close
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
