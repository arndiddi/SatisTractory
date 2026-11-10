/**
 * Loads the Maps JavaScript API once, asynchronously, resolving via the
 * required callback parameter (with loading=async the API is not ready at
 * script onload). Browser key and tracking channel come from the Google Maps
 * connector's public env vars.
 */
let loading: Promise<any> | null = null;

export function loadGoogleMaps(): Promise<any> {
  if (typeof window !== "undefined" && (window as any).google?.maps) {
    return Promise.resolve((window as any).google.maps);
  }
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const key = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"] as string | undefined;
    const channel = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID"] as string | undefined;
    if (!key) {
      loading = null;
      reject(new Error("Google Maps is not configured for this site."));
      return;
    }
    (window as any).__nhlInitMap = () => resolve((window as any).google.maps);
    const s = document.createElement("script");
    s.src =
      `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}` +
      `&loading=async&callback=__nhlInitMap${channel ? `&channel=${encodeURIComponent(channel)}` : ""}`;
    s.async = true;
    s.onerror = () => {
      loading = null;
      reject(new Error("Google Maps failed to load."));
    };
    document.head.appendChild(s);
  });
  return loading;
}
