import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getCountyExploreFn, listCountiesFn } from "@/lib/explore.functions";
import { SECTIONS } from "@/lib/health";
import { CHOROPLETH_COLORS, US_STATES, stateByAbbr, type TractValue } from "@/lib/explore";
import { ChoroplethMap } from "@/components/ChoroplethMap";
import { MethodologyFooter, SiteHeader } from "@/components/SiteChrome";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const search = (s: Record<string, unknown>) => ({
  state: typeof s["state"] === "string" ? s["state"] : "",
  county: typeof s["county"] === "string" ? s["county"] : "",
  measure: typeof s["measure"] === "string" ? s["measure"] : "DEPRESSION",
  dir: s["dir"] === "best" ? ("best" as const) : ("vulnerable" as const),
  worseOnly: s["worseOnly"] === true || s["worseOnly"] === "true",
});

export const Route = createFileRoute("/explore")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Explore an area — SatisTractory" },
      { name: "description", content: "Compare census tracts across a county on any health measure, with uncertainty ranges and a color-coded map." },
      { property: "og:title", content: "Explore an area — SatisTractory" },
      { property: "og:description", content: "Compare census tracts across a county on any health measure, with uncertainty ranges and a color-coded map." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ExplorePage,
});

const selectClass =
  "h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function ExplorePage() {
  const params = Route.useSearch();
  const navigate = useNavigate();
  const fetchCounties = useServerFn(listCountiesFn);
  const fetchExplore = useServerFn(getCountyExploreFn);

  const setParams = (patch: Partial<ReturnType<typeof search>>) =>
    navigate({ to: "/explore", search: { ...params, ...patch }, replace: true });

  const countiesQ = useQuery({
    queryKey: ["counties", params.state],
    queryFn: () => fetchCounties({ data: { state: params.state } }),
    enabled: params.state.length > 0,
    staleTime: Infinity,
  });
  const counties = countiesQ.data?.ok ? countiesQ.data.counties : [];

  // Default to the first county once the list loads.
  useEffect(() => {
    if (params.state && !params.county && counties.length) {
      setParams({ county: counties[0]!.fips });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.state, params.county, counties.length]);

  const exploreQ = useQuery({
    queryKey: ["explore", params.state, params.county, params.measure, params.worseOnly],
    queryFn: () =>
      fetchExplore({
        data: { state: params.state, county: params.county, measure: params.measure, worseOnly: params.worseOnly },
      }),
    enabled: params.state.length > 0 && params.county.length > 0,
    staleTime: Infinity,
    retry: false,
  });
  const result = exploreQ.data?.ok ? exploreQ.data.result : null;

  const onTractClick = useCallback(
    (geoid: string) => navigate({ to: "/report", search: { address: "", geoid } }),
    [navigate],
  );

  const measureLabel = useMemo(
    () => SECTIONS.flatMap((s) => s.measures).find((m) => m.id === params.measure)?.label ?? params.measure,
    [params.measure],
  );

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">Explore an area</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Compare census tracts across a county on any health measure.
        </p>
        <p role="note" className="mt-4 rounded-xl border border-primary/20 bg-primary-soft p-4 text-sm text-foreground">
          Rankings between neighboring tracts are often within the margin of error. Use this to spot patterns,
          not to label neighborhoods.
        </p>

        <div className="mt-6 flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">State</span>
            <select
              className={selectClass}
              value={params.state}
              onChange={(e) => setParams({ state: e.target.value, county: "" })}
            >
              <option value="">Choose a state</option>
              {US_STATES.map((s) => (
                <option key={s.abbr} value={s.abbr}>{s.name}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">County</span>
            <select
              className={selectClass}
              value={params.county}
              disabled={!params.state || countiesQ.isPending}
              onChange={(e) => setParams({ county: e.target.value })}
            >
              {!params.county && <option value="">Choose a county</option>}
              {counties.map((c) => (
                <option key={c.fips} value={c.fips}>{c.name} County</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Measure</span>
            <select className={selectClass} value={params.measure} onChange={(e) => setParams({ measure: e.target.value })}>
              {SECTIONS.map((section) => (
                <optgroup key={section.key} label={section.title}>
                  {section.measures.map((m) => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <div className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Show</span>
            <div className="flex gap-2" role="group" aria-label="Ranking direction">
              <Button
                type="button"
                size="sm"
                variant={params.dir === "vulnerable" ? "default" : "outline"}
                className="rounded-full"
                onClick={() => setParams({ dir: "vulnerable" })}
              >
                Most vulnerable
              </Button>
              <Button
                type="button"
                size="sm"
                variant={params.dir === "best" ? "default" : "outline"}
                className="rounded-full"
                onClick={() => setParams({ dir: "best" })}
              >
                Best-performing
              </Button>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[var(--primary)]"
              checked={params.worseOnly}
              onChange={(e) => setParams({ worseOnly: e.target.checked })}
            />
            Only show tracts worse than the state average
          </label>
        </div>

        <div className="mt-6" aria-live="polite">
          {!params.state ? (
            <p className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
              Choose a state to get started.
            </p>
          ) : exploreQ.isPending || (params.state && !params.county) ? (
            <div aria-busy="true" aria-label="Loading county data">
              <Skeleton className="h-[32rem] w-full rounded-xl" />
            </div>
          ) : exploreQ.isError || !exploreQ.data?.ok ? (
            <div role="alert" className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
              {exploreQ.data && !exploreQ.data.ok ? exploreQ.data.error : "Couldn't load this area. Please try again shortly."}
            </div>
          ) : result && result.tracts.length === 0 ? (
            <p className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
              No tracts match the current filter.
            </p>
          ) : result ? (
            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {measureLabel} in {result.countyName} County, {result.stateAbbr}
                </h2>
                <div className="mt-3">
                  <ChoroplethMap geojson={result.geojson} tracts={result.tracts} edges={result.edges} onTractClick={onTractClick} />
                </div>
                <Legend edges={result.edges} />
              </div>
              <TopPanel
                tracts={params.dir === "vulnerable" ? result.top10 : [...result.top10].reverse()}
                direction={result.direction}
                dirLabel={params.dir === "vulnerable" ? "Most vulnerable" : "Best-performing"}
                countyMean={result.countyMean}
                clearlyAbove={result.clearlyAbove}
                onTractClick={onTractClick}
              />
            </div>
          ) : null}
        </div>
      </main>
      <MethodologyFooter />
    </div>
  );
}

function Legend({ edges }: { edges: number[] }) {
  if (edges.length < 6) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Map legend">
      <span className="font-medium text-foreground">Share of adults:</span>
      {CHOROPLETH_COLORS.map((color, i) => (
        <span key={color} className="flex items-center gap-1.5 tabular-nums">
          <span aria-hidden className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: color }} />
          {edges[i]!.toFixed(1)}–{edges[i + 1]!.toFixed(1)}%
        </span>
      ))}
      <span className="flex items-center gap-1.5">
        <span aria-hidden className="inline-block h-3 w-3 rounded-sm bg-muted" />
        No estimate
      </span>
    </div>
  );
}

function TopPanel({
  tracts,
  direction,
  dirLabel,
  countyMean,
  clearlyAbove,
  onTractClick,
}: {
  tracts: TractValue[];
  direction: "higherWorse" | "higherBetter";
  dirLabel: string;
  countyMean: number;
  clearlyAbove: Record<string, boolean>;
  onTractClick: (geoid: string) => void;
}) {
  // For "higher is better" measures the server ranks ascending; "above county average"
  // only makes sense for burdens, so for preventive-care measures we flag tracts whose
  // whole interval sits below the mean instead.
  const flagged = (t: TractValue) =>
    direction === "higherWorse" ? clearlyAbove[t.geoid] : t.high < countyMean;
  return (
    <aside className="rounded-xl border border-border bg-card p-4" aria-labelledby="h-top10">
      <h2 id="h-top10" className="text-lg font-semibold text-foreground">{dirLabel} tracts</h2>
      <p className="mt-1 text-xs text-muted-foreground tabular-nums">County average: {countyMean.toFixed(1)}%</p>
      <ol className="mt-3 space-y-2">
        {tracts.map((t, i) => (
          <li key={t.geoid}>
            <button
              type="button"
              onClick={() => onTractClick(t.geoid)}
              className="w-full rounded-lg border border-border p-3 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-foreground">
                  {i + 1}. Tract {t.name}
                </span>
                <span className="text-sm font-semibold tabular-nums text-foreground">{t.value.toFixed(1)}%</span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                Range {t.low.toFixed(1)}–{t.high.toFixed(1)}%{t.population != null && <> · Pop. {t.population.toLocaleString()}</>}
              </p>
              <p className={cn("mt-1 text-xs font-medium", flagged(t) ? "text-worse" : "text-similar")}>
                {flagged(t) ? "Clearly above county average" : "Within uncertainty"}
              </p>
            </button>
          </li>
        ))}
      </ol>
    </aside>
  );
}
