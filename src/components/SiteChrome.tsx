import { Link } from "@tanstack/react-router";

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span aria-hidden className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="11" cy="11" r="6" /><path d="m20 20-4.5-4.5" /></svg>
          </span>
          <span className="font-serif text-lg font-semibold text-foreground">Neighborhood Health Lens</span>
        </Link>
      </div>
    </header>
  );
}

export function MethodologyFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>Methodology</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          These are model-based estimates from the CDC PLACES project (BRFSS survey data, 2023), not direct counts.
          Small-area estimates carry uncertainty — see the ranges on each card. This tool describes neighborhoods; it
          does not judge them.
        </p>
      </div>
    </footer>
  );
}
