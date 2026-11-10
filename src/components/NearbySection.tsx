import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getNearby } from "@/lib/nearby.functions";
import type { CategoryKey, NearbyPlace, NearbyResult } from "@/lib/nearby.server";
import { loadGoogleMaps } from "@/lib/google-maps";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const CATEGORY_META: Record<CategoryKey, { label: string; color: string }> = {
  hospital: { label: "Hospitals", color: "#b3442c" },
  doctor: { label: "Clinics & doctors", color: "#2b7a75" },
  pharmacy: { label: "Pharmacies", color: "#c98a1f" },
  school: { label: "Schools", color: "#3d6fa8" },
};
const CATEGORY_KEYS = Object.keys(CATEGORY_META) as CategoryKey[];
const RADIUS_OPTIONS = [1, 3, 5];

export function NearbySection({ geoid, lat, lon }: { geoid: string; lat: number; lon: number }) {
  const [radiusKm, setRadiusKm] = useState(3);
  const [active, setActive] = useState<Set<CategoryKey>>(new Set(CATEGORY_KEYS));
  const fetchNearby = useServerFn(getNearby);
  const q = useQuery({
    queryKey: ["nearby", geoid, radiusKm],
    queryFn: () => fetchNearby({ data: { geoid, lat, lon, radiusKm } }),
    staleTime: Infinity,
    retry: false,
  });

  const toggle = (key: CategoryKey) => {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const nearby = q.data?.ok ? q.data.nearby : null;

  return (
    <section className="mt-12" aria-labelledby="h-nearby">
      <h2 id="h-nearby" className="text-2xl font-semibold text-foreground">What's nearby</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Health care and schools within walking or driving distance of this address, from Google Places.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-2" role="group" aria-label="Search radius">
          <span className="text-sm text-muted-foreground">Within</span>
          {RADIUS_OPTIONS.map((r) => (
            <Button
              key={r}
              type="button"
              size="sm"
              variant={radiusKm === r ? "default" : "outline"}
              className="rounded-full"
              onClick={() => setRadiusKm(r)}
            >
              {r} km
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Place categories">
          {CATEGORY_KEYS.map((key) => (
            <Button
              key={key}
              type="button"
              size="sm"
              variant={active.has(key) ? "default" : "outline"}
              className="rounded-full"
              aria-pressed={active.has(key)}
              onClick={() => toggle(key)}
            >
              <span aria-hidden className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CATEGORY_META[key].color }} />
              {CATEGORY_META[key].label}
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-5" aria-live="polite">
        {q.isPending ? (
          <div aria-busy="true" aria-label="Searching nearby places">
            <Skeleton className="h-72 w-full rounded-xl" />
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          </div>
        ) : q.isError || !q.data?.ok ? (
          <div role="alert" className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
            {q.data && !q.data.ok ? q.data.error : "The nearby search isn't available right now."}
          </div>
        ) : (
          <NearbyView nearby={nearby!} lat={lat} lon={lon} active={active} />
        )}
      </div>
    </section>
  );
}

function NearbyView({ nearby, lat, lon, active }: { nearby: NearbyResult; lat: number; lon: number; active: Set<CategoryKey> }) {
  const hospitals = nearby.places.hospital;
  return (
    <div>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <NearbyMap nearby={nearby} lat={lat} lon={lon} active={active} />
        <div className="space-y-3">
          <SummaryCard nearby={nearby} />
          <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Reading the ratings</p>
            <p className="mt-1">
              "Google user rating" is the average review score from Google users. "CMS quality rating" is the
              federal Medicare overall star rating for hospitals — a different thing entirely.
            </p>
          </div>
        </div>
      </div>

      {active.has("hospital") && hospitals.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-foreground">Hospitals within {nearby.radiusKm} km</h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {hospitals.map((h) => <HospitalCard key={`${h.name}-${h.address}`} h={h} />)}
          </div>
        </div>
      )}

      {(["doctor", "pharmacy", "school"] as CategoryKey[]).map(
        (key) =>
          active.has(key) &&
          nearby.places[key].length > 0 && (
            <div key={key} className="mt-6">
              <h3 className="text-lg font-semibold text-foreground">
                {CATEGORY_META[key].label} within {nearby.radiusKm} km
              </h3>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {nearby.places[key].map((p) => (
                  <li key={`${p.name}-${p.address}`} className="rounded-xl border border-border bg-card p-3 text-sm">
                    <p className="font-medium text-foreground">{p.name}</p>
                    <p className="mt-0.5 text-muted-foreground">{p.address}</p>
                    <p className="mt-1 text-muted-foreground tabular-nums">
                      {p.distanceKm.toFixed(1)} km away
                      {p.googleRating != null && <> · Google user rating {p.googleRating.toFixed(1)}★</>}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ),
      )}
    </div>
  );
}

function SummaryCard({ nearby }: { nearby: NearbyResult }) {
  const items: [string, string][] = [
    [
      "Nearest hospital with an ER",
      nearby.summary.nearestEdHospital
        ? `${nearby.summary.nearestEdHospital.distanceKm.toFixed(1)} km — ${nearby.summary.nearestEdHospital.name}`
        : "None found nearby",
    ],
    ["Clinics & doctors nearby", String(nearby.summary.clinicCount)],
    ["Schools nearby", String(nearby.summary.schoolCount)],
  ];
  return (
    <div className="rounded-xl border border-primary/20 bg-primary-soft p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-accent-foreground">At a glance</h3>
      <dl className="mt-2 space-y-2">
        {items.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-sm font-medium text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Stars({ n, label }: { n: number; label: string }) {
  return (
    <span role="img" aria-label={`${label}: ${n} out of 5 stars`} className="tabular-nums">
      <span aria-hidden className="text-primary">{"★".repeat(n)}</span>
      <span aria-hidden className="text-muted-foreground/40">{"★".repeat(5 - n)}</span>
    </span>
  );
}

function HospitalCard({ h }: { h: NearbyPlace }) {
  return (
    <article className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <h4 className="text-sm font-medium leading-snug text-foreground">{h.name}</h4>
      <p className="mt-0.5 text-xs text-muted-foreground">{h.address}</p>
      <p className="mt-1 text-xs text-muted-foreground tabular-nums">{h.distanceKm.toFixed(1)} km away</p>
      <div className="mt-3 space-y-1.5 text-sm">
        {h.googleRating != null && (
          <p className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Google user rating</span>
            <Stars n={Math.round(h.googleRating)} label="Google user rating" />
          </p>
        )}
        <p className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">CMS quality rating</span>
          {h.cms?.rating ? <Stars n={h.cms.rating} label="CMS quality rating" /> : <span className="text-xs text-muted-foreground">Not rated by CMS</span>}
        </p>
        {h.cms && (
          <>
            {h.cms.hospitalType && <p className="text-xs text-muted-foreground">{h.cms.hospitalType}</p>}
            <p className="text-xs text-muted-foreground">
              Emergency services: {h.cms.emergencyServices === true ? "Yes" : h.cms.emergencyServices === false ? "No" : "Unknown"}
            </p>
            <div className="mt-2 rounded-lg bg-muted p-2 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">CMS measure counts (better / worse than national)</p>
              <p className="mt-1 tabular-nums">
                Safety {h.cms.safety.better}/{h.cms.safety.worse} · Mortality {h.cms.mortality.better}/{h.cms.mortality.worse} · Readmission {h.cms.readmission.better}/{h.cms.readmission.worse}
              </p>
            </div>
          </>
        )}
      </div>
    </article>
  );
}

function NearbyMap({ nearby, lat, lon, active }: { nearby: NearbyResult; lat: number; lon: number; active: Set<CategoryKey> }) {
  const ref = useRef<HTMLDivElement>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let map: any;
    let markers: any[] = [];
    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !ref.current) return;
        map = new maps.Map(ref.current, {
          center: { lat, lng: lon },
          zoom: nearby.radiusKm <= 1 ? 15 : nearby.radiusKm <= 3 ? 14 : 13,
          clickableIcons: false,
          mapTypeControl: false,
          streetViewControl: false,
        });
        const info = new maps.InfoWindow();
        markers.push(
          new maps.Marker({
            map,
            position: { lat, lng: lon },
            title: "Your address",
            icon: { path: maps.SymbolPath.CIRCLE, scale: 8, fillColor: "#1f2937", fillOpacity: 1, strokeColor: "#ffffff", strokeWeight: 2 },
          }),
        );
        for (const key of CATEGORY_KEYS) {
          if (!active.has(key)) continue;
          for (const p of nearby.places[key]) {
            const marker = new maps.Marker({
              map,
              position: { lat: p.lat, lng: p.lng },
              title: p.name,
              icon: { path: maps.SymbolPath.CIRCLE, scale: 7, fillColor: CATEGORY_META[key].color, fillOpacity: 1, strokeColor: "#ffffff", strokeWeight: 2 },
            });
            marker.addListener("click", () => {
              info.setContent(
                `<div style="font-family:sans-serif;max-width:240px"><strong>${p.name}</strong><br/>${p.address}<br/>${p.distanceKm.toFixed(1)} km away</div>`,
              );
              info.open({ map, anchor: marker });
            });
            markers.push(marker);
          }
        }
      })
      .catch((e) => !cancelled && setMapError(e instanceof Error ? e.message : "The map failed to load."));
    return () => {
      cancelled = true;
      markers.forEach((m) => m.setMap(null));
      markers = [];
    };
  }, [nearby, lat, lon, active]);

  if (mapError) {
    return (
      <div role="alert" className="grid h-72 place-items-center rounded-xl border border-border bg-muted p-6 text-center text-sm text-muted-foreground">
        {mapError}
      </div>
    );
  }
  return <div ref={ref} role="img" aria-label="Map of nearby hospitals, clinics, pharmacies and schools" className="h-72 w-full rounded-xl border border-border lg:h-96" />;
}
