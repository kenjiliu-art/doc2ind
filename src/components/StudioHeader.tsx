import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import kenjiLogo from "@/assets/kenji-logo.png";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export function StudioHeader() {
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);
  const { user } = useAuth();

  useEffect(() => {
    if (typeof window === "undefined") return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const y = window.scrollY;
        const dy = y - lastScrollY.current;
        if (y < 40) setHidden(false);
        else if (dy > 6) setHidden(true);
        else if (dy < -6) setHidden(false);
        lastScrollY.current = y;
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={cn(
        "sticky top-0 z-30 border-b border-border bg-sidebar/85 backdrop-blur transition-transform duration-300",
        hidden ? "-translate-y-full" : "translate-y-0",
      )}
    >
      <div className="mx-auto flex max-w-[1680px] items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <a
          href="https://kenjiliu.com"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Visit kenjiliu.com"
          className="shrink-0"
        >
          <img
            src={kenjiLogo}
            alt="Kenji C Liu logo"
            className="h-8 w-auto object-contain sm:h-10"
            loading="eager"
          />
        </a>
        <span className="text-[10px] uppercase tracking-[0.3em] text-[#8f2419]">
          Word 2 InDesign
        </span>
        <div className="ml-auto flex items-center gap-3 text-xs">
          {user ? (
            <>
              <span className="hidden text-muted-foreground sm:inline">
                {user.email}
              </span>
              <button
                onClick={() => supabase.auth.signOut()}
                className="font-semibold text-muted-foreground hover:text-foreground"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="font-semibold text-primary hover:underline"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
