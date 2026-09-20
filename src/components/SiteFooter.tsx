import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-[1680px] flex-col items-center justify-between gap-3 px-4 py-6 sm:flex-row sm:px-6 lg:px-8">
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Kenji Liu. All rights reserved.
        </p>
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs">
          <Link
            to="/terms"
            className="text-muted-foreground hover:text-foreground"
          >
            Terms
          </Link>
          <Link
            to="/privacy"
            className="text-muted-foreground hover:text-foreground"
          >
            Privacy
          </Link>
          <a
            href="https://kenjiliu.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground"
          >
            kenjiliu.com
          </a>
        </nav>
      </div>
    </footer>
  );
}
