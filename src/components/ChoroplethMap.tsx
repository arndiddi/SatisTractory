import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/google-maps";
import { binIndex, CHOROPLETH_COLORS, type TractValue } from "@/lib/explore";

interface Props {
  geojson: any;
  tracts: TractValue[];
  edges: number[];
  onTractClick: (geoid: string) => void;
}

export function ChoroplethMap({ geojson, tracts, edges, onTractClick }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let map: any;
    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !ref.current) return;
        const valueByGeoid = new Map(tracts.map((t) => [t.geoid, t]));
        map = new maps.Map(ref.current, {
          clickableIcons: false,
          mapTypeControl: false,
          streetViewControl: false,
          disableDefaultUI: true,
          zoomControl: true,
        });
        map.data.addGeoJson(geojson);
        map.data.setStyle((feature: any) => {
          const t = valueByGeoid.get(String(feature.getProperty("GEOID")));
          if (!t) {
            return { fillColor: "#e5e7eb", fillOpacity: 0.4, strokeColor: "#ffffff", strokeWeight: 1 };
          }
          return {
            fillColor: CHOROPLETH_COLORS[binIndex(t.value, edges)],
            fillOpacity: 0.75,
            strokeColor: "#ffffff",
            strokeWeight: 1,
          };
        });

        const bounds = new maps.LatLngBounds();
        map.data.forEach((feature: any) => {
          feature.getGeometry()?.forEachLatLng((ll: any) => bounds.extend(ll));
        });
        if (!bounds.isEmpty()) map.fitBounds(bounds);

        map.data.addListener("mouseover", (e: any) => {
          const geoid = String(e.feature.getProperty("GEOID"));
          const t = valueByGeoid.get(geoid);
          const tip = tipRef.current;
          if (!tip) return;
          tip.textContent = t ? `Tract ${t.name}: ${t.value.toFixed(1)}%` : `Tract ${e.feature.getProperty("NAME")}: no estimate`;
          tip.style.display = "block";
          map.data.overrideStyle(e.feature, { strokeColor: "#1f2937", strokeWeight: 2 });
        });
        map.data.addListener("mouseout", (e: any) => {
          if (tipRef.current) tipRef.current.style.display = "none";
          map.data.revertStyle(e.feature);
        });
        map.data.addListener("click", (e: any) => {
          const geoid = String(e.feature.getProperty("GEOID"));
          if (valueByGeoid.has(geoid)) onTractClick(geoid);
        });
      })
      .catch((e) => !cancelled && setMapError(e instanceof Error ? e.message : "The map failed to load."));
    return () => {
      cancelled = true;
      map?.data?.setMap(null);
    };
  }, [geojson, tracts, edges, onTractClick]);

  if (mapError) {
    return (
      <div role="alert" className="grid h-[32rem] place-items-center rounded-xl border border-border bg-muted p-6 text-center text-sm text-muted-foreground">
        {mapError}
      </div>
    );
  }
  return (
    <div className="relative">
      <div ref={ref} role="img" aria-label="Choropleth map of census tracts in this county" className="h-[32rem] w-full rounded-xl border border-border" />
      <div
        ref={tipRef}
        className="pointer-events-none absolute left-3 top-3 hidden rounded-md bg-card px-3 py-1.5 text-sm font-medium text-foreground shadow-[var(--shadow-card)]"
        style={{ display: "none" }}
      />
    </div>
  );
}
