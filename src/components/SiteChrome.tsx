import { Link } from "@tanstack/react-router";
import logo from "@/assets/satisfactory-logo.png";

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4 sm:px-6">
        <Link to="/" aria-label="SatisTractory home" className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <img src={logo} alt="SatisTractory" width={998} height={273} className="h-9 w-auto" />
        </Link>
        <nav className="ml-auto flex items-center gap-1" aria-label="Main">
          <Link
            to="/"
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Look up an address
          </Link>
          <Link
            to="/explore"
            search={{ state: "", county: "", measure: "DEPRESSION", dir: "vulnerable", worseOnly: false }}
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Explore an area
          </Link>
        </nav>
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
