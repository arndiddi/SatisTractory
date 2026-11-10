import { useEffect, useRef } from "react";

export default function TractMap({ lat, lon, label }: { lat: number; lon: number; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let map: import("leaflet").Map | undefined;
    let cancelled = false;
    import("leaflet").then((L) => {
      if (cancelled || !ref.current) return;
      map = L.map(ref.current, { scrollWheelZoom: false }).setView([lat, lon], 14);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);
      L.circleMarker([lat, lon], { radius: 9, weight: 3, fillOpacity: 1, className: "tract-pin" })
        .addTo(map)
        .bindTooltip(label);
    });
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [lat, lon, label]);
  return <div ref={ref} role="img" aria-label={`Map showing ${label}`} className="h-full w-full" />;
}
