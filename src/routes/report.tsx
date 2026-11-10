import { Suspense, lazy, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ClientOnly } from "@tanstack/react-router";
import { getSummary, lookupAddress, lookupTract } from "@/lib/health.functions";
import { SECTIONS, type Report } from "@/lib/health";
import { AddressSearch } from "@/components/AddressSearch";
import { MeasureCard } from "@/components/MeasureCard";
import { NearbySection } from "@/components/NearbySection";
import { MethodologyFooter, SiteHeader } from "@/components/SiteChrome";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

const TractMap = lazy(() => import("@/components/TractMap"));

export const Route = createFileRoute("/report")({
  validateSearch: (s: Record<string, unknown>) => ({
    address: typeof s["address"] === "string" ? s["address"] : "",
    geoid: typeof s["geoid"] === "string" ? s["geoid"] : "",
  }),
  head: () => ({
    meta: [
      { title: "Neighborhood health report — SatisTractory" },
      { name: "description", content: "Census tract health estimates compared with the state average, with a plain-language summary." },
      { property: "og:title", content: "Neighborhood health report" },
      { property: "og:description", content: "Census tract health estimates vs. the state average, explained plainly." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportPage,
});

function ReportPage() {
  const { address, geoid } = Route.useSearch();
  const lookup = useServerFn(lookupAddress);
  const lookupByTract = useServerFn(lookupTract);
  const q = useQuery({
    queryKey: ["report", address, geoid],
    queryFn: () => (address ? lookup({ data: { address } }) : lookupByTract({ data: { geoid } })),
    enabled: address.length > 0 || geoid.length > 0,
    staleTime: Infinity,
    retry: false,
  });

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <div className="max-w-2xl">
          <AddressSearch key={address} initial={address} showExamples={false} />
        </div>
        <div className="mt-8" aria-live="polite">
          {!address && !geoid ? (
            <ErrorState message="Enter an address above to get started." />
          ) : q.isPending ? (
            <LoadingSkeleton />
          ) : q.isError ? (
            <ErrorState message="Something went wrong while loading this neighborhood." />
          ) : !q.data.ok ? (
            <ErrorState message={q.data.error} />
          ) : (
            <ReportView report={q.data.report} />
          )}
        </div>
      </main>
      <MethodologyFooter />
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-xl border border-border bg-card p-8 text-center">
      <p className="font-serif text-xl font-semibold text-foreground">Hmm, we hit a snag</p>
      <p className="mx-auto mt-2 max-w-md text-muted-foreground">{message}</p>
      <Button asChild variant="outline" className="mt-5"><Link to="/">Back to start</Link></Button>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading neighborhood data">
      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        <div className="space-y-3"><Skeleton className="h-9 w-3/4" /><Skeleton className="h-5 w-1/2" /><Skeleton className="h-5 w-1/3" /></div>
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
      <Skeleton className="mt-8 h-36 w-full rounded-xl" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
      </div>
    </div>
  );
}

function ReportView({ report }: { report: Report }) {
  const scaleMax = Math.max(50, ...report.measures.map((m) => Math.max(m.high, m.stateAvg ?? 0))) * 1.05;
  return (
    <div>
      <section className="grid gap-6 md:grid-cols-[1fr_320px]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Census tract {report.tract}</p>
          <h1 className="mt-1 text-3xl font-semibold text-foreground sm:text-4xl">{report.matchedAddress}</h1>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
            <Fact label="County" value={`${report.county} County`} />
            <Fact label="State" value={report.state} />
            <Fact label="Population" value={report.population?.toLocaleString() ?? "—"} />
            <Fact label="Tract ID" value={report.geoid} />
          </dl>
        </div>
        <div className="h-48 overflow-hidden rounded-xl border border-border bg-muted">
          <ClientOnly fallback={<Skeleton className="h-full w-full" />}>
            <Suspense fallback={<Skeleton className="h-full w-full" />}>
              <TractMap lat={report.lat} lon={report.lon} label={`Census tract ${report.tract}`} />
            </Suspense>
          </ClientOnly>
        </div>
      </section>

      <SummaryPanel geoid={report.geoid} />

      <Legend />

      {SECTIONS.map((section) => {
        const items = report.measures.filter((m) => m.section === section.key);
        if (!items.length) return null;
        return (
          <section key={section.key} className="mt-10" aria-labelledby={`h-${section.key}`}>
            <h2 id={`h-${section.key}`} className="text-2xl font-semibold text-foreground">{section.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{section.blurb}</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((m) => <MeasureCard key={m.id} m={m} scaleMax={scaleMax} />)}
            </div>
          </section>
        );
      })}

      <div className="mt-10">
        <Button asChild variant="outline">
          <Link to="/explore" search={{ state: report.state, county: report.geoid.slice(2, 5), measure: "DEPRESSION", dir: "vulnerable", worseOnly: false }}>
            Explore all of {report.county} County →
          </Link>
        </Button>
      </div>

      <NearbySection geoid={report.geoid} lat={report.lat} lon={report.lon} />
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground tabular-nums">{value}</dd>
    </div>
  );
}

function Legend() {
  return (
    <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
      <span><span aria-hidden className="text-worse">▲</span> Worse than state</span>
      <span><span aria-hidden className="text-similar">●</span> Similar (state average within the tract's range)</span>
      <span><span aria-hidden className="text-better">▼</span> Better than state</span>
    </div>
  );
}

function SummaryPanel({ geoid }: { geoid: string }) {
  const fetchSummary = useServerFn(getSummary);
  const [state, setState] = useState<{ status: "loading" } | { status: "done"; text: string } | { status: "error"; text: string }>({ status: "loading" });
  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    fetchSummary({ data: { geoid } })
      .then((r) => active && setState(r.ok ? { status: "done", text: r.summary } : { status: "error", text: r.error }))
      .catch(() => active && setState({ status: "error", text: "The plain-language summary isn't available right now." }));
    return () => { active = false; };
  }, [geoid, fetchSummary]);
  return (
    <section aria-labelledby="h-summary" className="mt-8 rounded-xl border border-primary/20 bg-primary-soft p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <h2 id="h-summary" className="text-xl font-semibold text-foreground">In plain language</h2>
        <span className="rounded-full bg-card px-2 py-0.5 text-xs font-medium text-accent-foreground">AI-written</span>
      </div>
      <div className="mt-3" aria-live="polite">
        {state.status === "loading" ? (
          <div className="space-y-2" aria-label="Writing summary"><Skeleton className="h-4 w-full bg-card" /><Skeleton className="h-4 w-11/12 bg-card" /><Skeleton className="h-4 w-4/5 bg-card" /></div>
        ) : (
          <p className={state.status === "error" ? "text-muted-foreground" : "max-w-3xl leading-relaxed text-foreground"}>{state.text}</p>
        )}
      </div>
    </section>
  );
}
